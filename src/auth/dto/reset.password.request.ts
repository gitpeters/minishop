import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsStrongPassword,
} from 'class-validator';

export class ResetPasswordRequest {
  @IsString()
  @IsNotEmpty()
  otp: string;
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;
}
