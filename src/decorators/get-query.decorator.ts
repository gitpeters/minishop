import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const GetQuery = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    let page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || 10;
    let search = query.search || undefined;

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    return { page, limit, search };
  },
);
