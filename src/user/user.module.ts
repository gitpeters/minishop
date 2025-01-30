import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserHelper } from './helper';
import { AuthHelper } from 'src/auth/helper';

@Module({
  providers: [UserService, UserHelper],
  controllers: [UserController],
})
export class UserModule {}
