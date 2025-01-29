import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupRequest } from './dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('signup')
  async signUp(@Body() request: SignupRequest) {
    return await this.service.signup(request);
  }
}
