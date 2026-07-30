import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../database/redis.module';
import { SeatHoldService } from './holds.service';
import { HoldsGateway } from './holds.gateway';
import { HoldsCronService } from './holds-cron.service';
import { SeatHoldController } from './holds.controller';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRY') ?? ('15m' as any),
        } as any,
      }),
    }),
  ],
  controllers: [SeatHoldController],
  providers: [SeatHoldService, HoldsGateway, HoldsCronService],
  exports: [SeatHoldService, HoldsGateway],
})
export class HoldsModule {}
