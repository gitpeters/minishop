import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleRequest {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsOptional()
  description?: string;
}
