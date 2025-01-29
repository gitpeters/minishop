import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const RefreshToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const refreshToken = request.headers['x-refresh-token'];

    if (!refreshToken) {
      throw new BadRequestException(
        'Refresh token is required and must be passed as x-refresh-token in the header.',
      );
    }

    return refreshToken;
  },
);
