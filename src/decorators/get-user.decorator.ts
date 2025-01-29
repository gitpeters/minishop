import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | null, ctx: ExecutionContext) => {
    const request: Express.Request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If data is provided, return the specific property of the user
    return data ? user?.[data] : user;
  },
);
