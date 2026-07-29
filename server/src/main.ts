import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import cookieParser from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register WebSocket adapter using native WebSockets (ws library)
  // WsAdapter attaches to the underlying Node.js HTTP server created by Fastify
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.register(cookieParser);

  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;

  if (!rawOrigins) {
    throw new Error(
      'Provide a comma-separated list of allowed frontend origins.',
    );
  }

  const allowedOrigins = (rawOrigins || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
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

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
