import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategy';
import { JwtModule } from '@nestjs/jwt';
import { AuthHelper } from './helper';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, JwtStrategy, AuthHelper],
  controllers: [AuthController],
})
export class AuthModule {}
