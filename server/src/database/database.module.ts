import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './index';
import { Database } from './database.types';

@Global()
@Module({
  providers: [
    {
      provide: 'DRIZZLE_DB',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Database => {
        const Pool = postgres(
          configService.getOrThrow<string>('DATABASE_URL'),
          {
            max: 50,
            idle_timeout: 10,
            connect_timeout: 10,
          },
        );
        return drizzle(Pool, { schema });
      },
    },
  ],
  exports: ['DRIZZLE_DB'],
})
export class DatabaseModule {}
