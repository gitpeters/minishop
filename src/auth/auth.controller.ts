import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequest, ResetPasswordRequest, SignupRequest } from './dto';
import { RefreshToken } from 'src/decorators';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('/signup')
  async signUp(@Body() request: SignupRequest) {
    return await this.service.signup(request);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() request: LoginRequest) {
    return await this.service.login(request);
  }

  @Patch('/verify')
  async verifyAccount(@Query('token') token: string) {
    return await this.service.verifyAccount(token);
  }

  @Post('/resend-token/:email')
  @HttpCode(HttpStatus.OK)
  async resendVerificationToken(@Param('email') email: string) {
    await this.service.resendVerificationToken(email);
  }

  @Post('/reset-password/:email')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Param('email') email: string) {
    await this.service.resetPassword(email);
  }

  @Patch('/confirm-password-reset')
  async confirmPasswordReset(@Body() request: ResetPasswordRequest) {
    return await this.service.confirmPasswordReset(request);
  }

  @Post('/refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@RefreshToken() refreshToke: string) {
    return await this.service.refreshToken(refreshToke);
  }
}
