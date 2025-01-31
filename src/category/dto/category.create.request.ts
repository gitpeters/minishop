import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryRequest {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsOptional()
  description?: string;
}
