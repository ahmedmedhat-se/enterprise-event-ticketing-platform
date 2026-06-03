import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v7 as uuidv7 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OrganizerService } from '../organizer/organizer.service';
import { RedisService } from '../database/redis.service';
import {
  FanSignupDto,
  FanLoginDto,
  OrganizerSignupDto,
  OrganizerLoginDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly REFRESH_TTL_MS: number;
  private readonly CONSUMED_MARKER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly usersService: UsersService,
    private readonly organizerService: OrganizerService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const days = this.configService.get<number>('JWT_REFRESH_EXPIRY_DAYS', 90);
    this.REFRESH_TTL_MS = days * 24 * 60 * 60 * 1000;
  }

  // ==================== FAN ====================

  async signupFan(dto: FanSignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.createFan({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
    });

    const { accessToken, refreshToken } = await this.createTokenPair(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async loginFan(dto: FanLoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== 'fan') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.createTokenPair(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // ==================== ORGANIZER ====================

  async signupOrganizer(dto: OrganizerSignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.organizerService.createOrganizer({
      name: dto.name,
      email: dto.email,
      passwordHash,
      businessName: dto.businessName,
      businessRegistrationNumber: dto.businessRegistrationNumber,
      taxId: dto.taxId,
    });

    const { accessToken, refreshToken } = await this.createTokenPair(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async loginOrganizer(dto: OrganizerLoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== 'organizer') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.createTokenPair(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // ==================== REFRESH TOKEN ====================

  async refreshToken(oldToken: string, expectedRole: string) {
    // look for the token in Redis
    const tokenData = await this.redisService.getJson<{
      userId: string;
      familyId: string;
    }>(`rt:${oldToken}`);

    if (tokenData) {
      // token is valid and not consumed — normal rotation
      return this.rotateToken(
        oldToken,
        tokenData.userId,
        tokenData.familyId,
        expectedRole,
      );
    }

    // check if it was consumed (reuse detection)
    const consumedFamilyId = await this.redisService.get(
      `rt_consumed:${oldToken}`,
    );

    if (consumedFamilyId) {
      // REUSE DETECTED — someone is using an already-rotated token
      this.logger.warn(
        `Refresh token reuse detected for family: ${consumedFamilyId}`,
      );
      await this.handleReuseDetection(consumedFamilyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please log in again.',
      );
    }

    // neither found — token expired or never existed
    throw new UnauthorizedException(
      'Refresh token expired. Please log in again.',
    );
  }

  // ==================== PRIVATE HELPERS ====================

  private async createTokenPair(userId: string) {
    const familyId = uuidv7();
    const refreshToken = uuidv7();

    await this.redisService.setJson(
      `rt:${refreshToken}`,
      { userId, familyId },
      this.REFRESH_TTL_MS,
    );

    await this.redisService.setJson(
      `rt_family:${familyId}`,
      { userId, latestToken: refreshToken },
      this.REFRESH_TTL_MS,
    );

    const user = await this.usersService.findById(userId);
    const accessToken = this.jwtService.sign({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
      tokenVersion: user!.tokenVersion,
    });

    return { accessToken, refreshToken };
  }

  private async rotateToken(
    oldToken: string,
    userId: string,
    familyId: string,
    expectedRole: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.role !== expectedRole) {
      throw new UnauthorizedException('Invalid role for this endpoint');
    }

    // mark old token as consumed
    await this.redisService.del(`rt:${oldToken}`);
    await this.redisService.set(
      `rt_consumed:${oldToken}`,
      familyId,
      this.CONSUMED_MARKER_TTL_MS,
    );

    // generate new refresh token in the same family
    const newRefreshToken = uuidv7();
    await this.redisService.setJson(
      `rt:${newRefreshToken}`,
      { userId, familyId },
      this.REFRESH_TTL_MS,
    );

    // update family metadata to point to the new latest token
    await this.redisService.setJson(
      `rt_family:${familyId}`,
      { userId, latestToken: newRefreshToken },
      this.REFRESH_TTL_MS,
    );

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  private async handleReuseDetection(familyId: string): Promise<void> {
    // get the latest valid token from the family
    const familyData = await this.redisService.getJson<{
      userId: string;
      latestToken: string;
    }>(`rt_family:${familyId}`);

    if (familyData) {
      // delete the latest valid refresh token (kills the attacker's token)
      await this.redisService.del(`rt:${familyData.latestToken}`);
      // delete family metadata
      await this.redisService.del(`rt_family:${familyId}`);
    }

    // increment tokenVersion in db to invalidate all access tokens for this user
    if (familyData?.userId) {
      await this.usersService.incrementTokenVersion(familyData.userId);
    }
    // now user have to log in FORCIBLY again
  }

  private sanitizeUser(user: any) {
    const { passwordHash, deletedAt, ...safe } = user;
    return safe;
  }
}
