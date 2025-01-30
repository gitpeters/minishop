import { IsOptional, IsString } from 'class-validator';

export class UpdateUserRequest {
  @IsString()
  @IsOptional()
  email?: string;
  @IsString()
  @IsOptional()
  firstName?: string;
  @IsString()
  @IsOptional()
  lastName?: string;
}
