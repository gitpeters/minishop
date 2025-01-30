import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  APIQuery,
  APIResponse,
  Pagination,
  PaginationResult,
} from 'src/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserHelper } from './helper';
import {
  AddressRequest,
  AddressResponse,
  ChagnePasswordRequest,
  UpdateAddressRequest,
  UpdateUserRequest,
  UserResponse,
} from './dto';
import { LoginResponse } from 'src/auth/dto';

import * as argon from 'argon2';
import { AuthService } from 'src/auth/auth.service';
import { AuthHelper } from 'src/auth/helper';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: UserHelper,
  ) {}

  async getAllUsers(query: APIQuery): Promise<APIResponse<UserResponse[]>> {
    const { page, limit, search } = query;
    const pagination: Pagination = new Pagination(page, limit);

    const totalElements = await this.prisma.user.count({
      where: {
        roles: {
          none: {
            role: {
              name: 'ADMIN', // Exclude users who have the 'ADMIN' role
            },
          },
        },
      },
    });

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            roles: {
              none: {
                role: {
                  name: 'ADMIN', // Exclude users who have the 'ADMIN' role
                },
              },
            },
          },
          search
            ? {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      skip: pagination.getSkip(),
      take: pagination.getTake(),
      include: { roles: { include: { role: true } }, address: true },
      orderBy: { createdAt: 'desc' },
    });

    const responses = users.map((user) => {
      const roles = user.roles.map((role) => role.role.name);
      let address: AddressResponse | undefined;
      if (user.address) {
        address = this.helper.mapToAddressResponse(user.address);
      }

      return this.helper.mapToUserResponse(user, roles, address);
    });

    const paginationResult = new PaginationResult(
      Math.ceil(totalElements / limit),
      limit,
      totalElements,
      responses.length,
    );
    return new APIResponse('success', responses, paginationResult);
  }

  async getUserProfile(publicId: string): Promise<APIResponse<UserResponse>> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      include: { roles: { include: { role: true } }, address: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const roles = user.roles.map((role) => role.role.name);
    let address: AddressResponse | undefined;
    if (user.address) {
      address = this.helper.mapToAddressResponse(user.address);
    }
    const response = this.helper.mapToUserResponse(user, roles, address);
    return new APIResponse('success', response);
  }

  async updateProfile(
    publicId: string,
    request: UpdateUserRequest,
  ): Promise<APIResponse<UserResponse>> {
    const user = await this.prisma.user.update({
      where: { publicId },
      data: { ...request },
      include: { roles: { include: { role: true } }, address: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const roles = user.roles.map((role) => role.role.name);
    let address: AddressResponse | undefined;
    if (user.address) {
      address = this.helper.mapToAddressResponse(user.address);
    }
    const response = this.helper.mapToUserResponse(user, roles, address);
    return new APIResponse('success', response);
  }

  async deactivateAccount(publicId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { publicId },
      data: { isAccountDeleted: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  async redeactivateAccount(publicId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { publicId },
      data: { isAccountDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  async deleteUserAccount(id: number): Promise<void> {
    const user = await this.prisma.user.delete({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
  }

  async changePassword(
    publicId: string,
    request: ChagnePasswordRequest,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      include: { roles: { include: { role: true } }, address: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const isPasswordVerified = await argon.verify(
      user.password,
      request.oldPassword,
    );

    if (!isPasswordVerified)
      throw new UnauthorizedException('Incorrect password');

    const hashedPassword = await argon.hash(request.newPassword);

    await this.prisma.user.update({
      where: { publicId },
      data: {
        password: hashedPassword,
        changedPasswordAt: new Date(Date.now()),
      },
    });
  }

  async addAddress(
    userPublicId: string,
    request: AddressRequest,
  ): Promise<APIResponse<AddressResponse>> {
    try {
      const address = await this.prisma.address.create({
        data: {
          userId: userPublicId,
          city: request.city,
          street: request.city,
          houseNumber: request.houseNumber,
          country: request.country,
        },
      });
      const response = this.helper.mapToAddressResponse(address);
      return new APIResponse('success', response);
    } catch (err) {
      this.logger.error(
        `Failed to create address with the following error:${err.message}`,
      );
      throw new InternalServerErrorException('Failed to create address');
    }
  }

  async updateAddress(
    userPublicId: string,
    request: UpdateAddressRequest,
  ): Promise<APIResponse<AddressResponse>> {
    const address = await this.prisma.address.update({
      where: { userId: userPublicId },
      data: { ...request },
    });
    const response = this.helper.mapToAddressResponse(address);
    return new APIResponse('success', response);
  }

  async deleteAddress(publicId: string, userPublicId: string): Promise<void> {
    try {
      await this.prisma.address.delete({
        where: { publicId: publicId, userId: userPublicId },
      });
    } catch (err) {
      this.logger.error(
        `Failed to delete address with the following error:${err.message}`,
      );
      throw new InternalServerErrorException('Failed to delete address');
    }
  }
}
