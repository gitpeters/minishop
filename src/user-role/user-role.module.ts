import { Global, Module } from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { UserRoleController } from './user-role.controller';
import { RoleHelper } from './helper.role';

@Global()
@Module({
  providers: [UserRoleService, RoleHelper],
  controllers: [UserRoleController],
  exports: [UserRoleService],
})
export class UserRoleModule {}
