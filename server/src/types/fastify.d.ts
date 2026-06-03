import type { AuthUser } from '../auth/interfaces/auth-user.interface';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}
