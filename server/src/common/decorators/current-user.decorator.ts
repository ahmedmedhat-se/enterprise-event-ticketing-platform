import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { FastifyRequest } from 'fastify';
import type { AuthUser } from 'src/auth/interfaces/auth-user.interface';

type AuthenticatedRequest = FastifyRequest & {
  user: AuthUser;
};

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    return data ? user[data] : user;
  },
);
