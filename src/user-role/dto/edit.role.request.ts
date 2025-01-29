import { IsString, IsOptional } from 'class-validator';

export class EditRoleRequest {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  @IsOptional()
  description?: string;
}
