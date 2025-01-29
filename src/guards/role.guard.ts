import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decorators';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) ||
      this.reflector.get<string[]>(ROLES_KEY, context.getClass());

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    this.logger.debug(request.user);

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User authentication required');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { publicId: user.publicId },
      include: { roles: { include: { role: true } } },
    });

    if (!dbUser) return false;

    const hasRole = dbUser.roles.some((role) =>
      requiredRoles.includes(role.role.name),
    );
    if (!hasRole) {
      throw new ForbiddenException(
        'Access denied! You do not have access to this resource.',
      );
    }

    return true;
  }
}
