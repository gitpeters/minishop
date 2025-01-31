import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class UpdateProductRequest {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  @IsOptional()
  availableQuantity?: number;

  @IsNumberString()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
