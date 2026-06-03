import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { UserAuthController } from './user-auth.controller';
import { OrganizerAuthController } from './organizer-auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { OrganizerModule } from '../organizer/organizer.module';
import { RedisModule } from '../database/redis.module';

@Module({
  imports: [
    UsersModule,
    OrganizerModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_ACCESS_EXPIRY'),
        },
      }),
    }),
  ],
  controllers: [UserAuthController, OrganizerAuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
