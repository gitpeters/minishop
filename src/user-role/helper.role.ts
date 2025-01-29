import { Injectable } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { RoleResponse, RoleUser } from './dto';

@Injectable()
export class RoleHelper {
  constructor() {}

  async mapToRoleResponse(role: Role, users: User[]): Promise<RoleResponse> {
    const response: RoleResponse = new RoleResponse();
    response.publicId = role.publicId; // Assuming Role has a publicId
    response.name = role.name;
    response.description = role.description || null;
    response.totalUsersAssigned = users.length;
    response.assignUsers = users.map((user) => {
      return {
        publicId: user.publicId,
        email: user.email,
      } as RoleUser;
    });
    return response;
  }
}
