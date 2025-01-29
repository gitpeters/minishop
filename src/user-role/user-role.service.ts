import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AssignRole,
  CreateRoleRequest,
  EditRoleRequest,
  RoleResponse,
} from './dto';
import { RoleHelper } from './helper.role';
import { Prisma, User } from '@prisma/client';
import {
  APIQuery,
  APIResponse,
  Pagination,
  PaginationResult,
} from 'src/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: RoleHelper,
  ) {}

  async findAllRoles(query: APIQuery): Promise<APIResponse<RoleResponse[]>> {
    const { page = 1, limit = 10, search } = query;
    const pagination: Pagination = new Pagination(page, limit);

    const totalElements = await this.prisma.role.count({
      where: {},
    });

    const roles = await this.prisma.role.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      include: { users: { include: { role: true, user: true } } },
      skip: pagination.getSkip(),
      take: pagination.getTake(),
      orderBy: { createdAt: 'desc' },
    });

    const responses: RoleResponse[] = await Promise.all(
      roles.map(async (role) => {
        const users: User[] = role.users.map((u) => u.user);
        return this.helper.mapToRoleResponse(role, users);
      }),
    );

    const paginationResult = new PaginationResult(
      Math.ceil(totalElements / limit),
      limit,
      totalElements,
      responses.length,
    );

    return new APIResponse('success', responses, paginationResult);
  }

  async createRole(
    request: CreateRoleRequest,
  ): Promise<APIResponse<RoleResponse>> {
    try {
      const role = await this.prisma.role.create({
        data: request,
        include: { users: { include: { role: true, user: true } } },
      });
      const users: User[] = role.users.map((u) => u.user);
      const response = this.helper.mapToRoleResponse(role, users);
      return new APIResponse('success', response);
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new BadRequestException('Role with name already exists!');
        }
      }
      throw new InternalServerErrorException(
        'Error occurred while creating role',
      );
    }
  }

  async editRole(
    publicId: string,
    request: EditRoleRequest,
  ): Promise<APIResponse<RoleResponse>> {
    try {
      const role = await this.prisma.role.update({
        where: { publicId: publicId },
        data: { ...request },
        include: { users: { include: { role: true, user: true } } },
      });
      const users: User[] = role.users.map((u) => u.user);
      const response = this.helper.mapToRoleResponse(role, users);
      return new APIResponse('success', response);
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new BadRequestException('Role with name already exists!');
        }
      }
      throw new InternalServerErrorException(
        'Error occurred while updating role',
      );
    }
  }

  async assignUserToRole(request: AssignRole): Promise<void> {
    this.logger.debug({ request });
    await this.prisma.userRole.create({
      data: { userId: request.userPublicId, roleId: request.rolePublicId },
    });
  }

  async removeUserFromRole(request: AssignRole): Promise<void> {
    try {
      await this.prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId: request.userPublicId,
            roleId: request.rolePublicId,
          },
        },
      });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(
        `Failed to remove user from role: ${err.message}`,
      );
    }
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

  async findRoleByPublicId(
    publicId: string,
  ): Promise<APIResponse<RoleResponse>> {
    const role = await this.prisma.role.findUnique({
      where: { publicId: publicId },
      include: { users: { include: { role: true, user: true } } },
    });
    if (!role) {
      throw new NotFoundException('role not found');
    }
    const users: User[] = role.users.map((u) => u.user);
    const response = this.helper.mapToRoleResponse(role, users);
    return new APIResponse('success', response);
  }

  async deleteRole(publicId: string): Promise<void> {
    try {
      await this.prisma.role.delete({ where: { publicId } });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(
        `Failed to delete role: ${err.message}`,
      );
    }
  }
}
