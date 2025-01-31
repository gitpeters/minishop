import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCategory {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  @IsOptional()
  description?: string;
}
