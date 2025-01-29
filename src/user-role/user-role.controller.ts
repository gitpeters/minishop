import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetQuery, Roles } from 'src/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/guards';
import { UserRoleService } from './user-role.service';
import { APIQuery } from 'src/common';
import { AssignRole, CreateRoleRequest, EditRoleRequest } from './dto';

@Controller('/api/v1/roles')
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserRoleController {
  constructor(private readonly service: UserRoleService) {}

  @Get()
  async getAllRoles(@GetQuery() query: APIQuery) {
    return await this.service.findAllRoles(query);
  }

  @Get('/:publicId')
  async getRole(@Param('publicId') publicId: string) {
    return await this.service.findRoleByPublicId(publicId);
  }

  @Post('/create')
  async createRole(@Body() request: CreateRoleRequest) {
    return await this.service.createRole(request);
  }

  @Patch('/edit/:publicId')
  async editRole(
    @Body() request: EditRoleRequest,
    @Param('publicId') publicId: string,
  ) {
    return await this.service.editRole(publicId, request);
  }

  @Delete('/delete/:publicId')
  async deleteRole(@Param('publicId') publicId: string) {
    return await this.service.deleteRole(publicId);
  }

  @Post('/assign-role')
  @HttpCode(HttpStatus.OK)
  async assignRoleToUser(@Body() request: AssignRole) {
    await this.service.assignUserToRole(request);
  }

  @Post('/remove-user-role')
  @HttpCode(HttpStatus.OK)
  async removeUserFromRole(@Body() request: AssignRole) {
    await this.service.removeUserFromRole(request);
  }
}
