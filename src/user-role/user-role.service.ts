import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRole, RoleResponse } from './dto';
import { RoleHelper } from './helper.role';
import { User } from '@prisma/client';

@Injectable()
export class UserRoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: RoleHelper,
  ) {}

  async assignUserToRole(request: AssignRole): Promise<void> {
    await this.prisma.userRole.create({
      data: { userId: request.userPublicId, roleId: request.rolePublicId },
    });
  }

  async findRoleByName(roleName: string): Promise<RoleResponse> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: { users: { include: { role: true, user: true } } },
    });
    if (!role) {
      throw new NotFoundException('role not found');
    }
    const users: User[] = role.users.map((u) => u.user);
    return this.helper.mapToRoleResponse(role, users);
  }
}
