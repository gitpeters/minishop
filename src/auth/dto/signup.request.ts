import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class SignupRequest {
  @IsString()
  @IsOptional()
  firstName?: string;
  @IsString()
  @IsOptional()
  lastName?: string;
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;
}
