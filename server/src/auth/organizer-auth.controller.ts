import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { OrganizerSignupDto, OrganizerLoginDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';

// make cookie not accessible by js
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

@Controller('organizer')
export class OrganizerAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(
    @Body() dto: OrganizerSignupDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.authService.signupOrganizer(dto);

    response.setCookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });

    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: OrganizerLoginDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.authService.loginOrganizer(dto);

    response.setCookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });

    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh-token')
  async refreshToken(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const oldToken = request.cookies['refresh_token'];
    if (!oldToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authService.refreshToken(oldToken, 'organizer');

    response.setCookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });

    return { accessToken: result.accessToken };
  }
}
