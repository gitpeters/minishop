import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class LoginRequest {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsString()
  @IsNotEmpty()
  password: string;
}
