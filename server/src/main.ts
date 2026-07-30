import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import cookieParser from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from './common/adapters/ws.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const frontendUrl = configService.get<string>('FRONTEND_URL');

  if (!frontendUrl) {
    logger.error('FRONTEND_URL environment variable is not set.');
    process.exit(1);
  }

  app.useWebSocketAdapter(new WsAdapter(frontendUrl));

  await app.register(cookieParser);

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === frontendUrl) return cb(null, true);
      cb(new Error(`Origin '${origin}' not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`Server running on port ${port}`);
}
bootstrap();
