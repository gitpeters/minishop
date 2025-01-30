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
import { JwtAuthGuard, RolesGuard } from 'src/guards';
import { UserService } from './user.service';
import { GetQuery, GetUser, Roles } from 'src/decorators';
import { APIQuery } from 'src/common';
import {
  AddressRequest,
  ChagnePasswordRequest,
  UpdateAddressRequest,
  UpdateUserRequest,
} from './dto';

@Controller('/api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  @Roles('ADMIN')
  async getAllUsers(@GetQuery() query: APIQuery) {
    return await this.service.getAllUsers(query);
  }

  @Patch('/update-profile')
  async updateUserProfile(
    @GetUser('publicId') publicId: string,
    @Body() request: UpdateUserRequest,
  ) {
    return await this.service.updateProfile(publicId, request);
  }

  @Patch('/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @GetUser('publicId') publicId: string,
    @Body() request: ChagnePasswordRequest,
  ) {
    await this.service.changePassword(publicId, request);
  }

  @Get('/me')
  async getUserProfile(@GetUser('publicId') publicId: string) {
    return await this.service.getUserProfile(publicId);
  }

  @Post('/me/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateUserAccount(@GetUser('publicId') publicId: string) {
    await this.service.deactivateAccount(publicId);
  }

  @Post('/redeactivate/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'ACCOUNT_OFFICER')
  async redeactivateUserAccount(@Param('userId') userId: string) {
    await this.service.redeactivateAccount(userId);
  }

  @Delete('/delete/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  async deleteUserAccount(@Param('id') id: number) {
    await this.service.deleteUserAccount(id);
  }

  @Post('/address')
  @HttpCode(HttpStatus.OK)
  async addAddress(
    @GetUser('publicId') userId: string,
    @Body() request: AddressRequest,
  ) {
    return await this.service.addAddress(userId, request);
  }

  @Patch('/address')
  @HttpCode(HttpStatus.OK)
  async editAddress(
    @GetUser('publicId') userId: string,
    @Body() request: UpdateAddressRequest,
  ) {
    return await this.service.updateAddress(userId, request);
  }

  @Delete('/address/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @GetUser('publicId') userId: string,
    @Param('id') id: string,
  ) {
    await this.service.deleteAddress(id, userId);
  }
}
