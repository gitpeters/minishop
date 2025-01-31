import {
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductRequest {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  availableQuantity: number;

  @IsNumberString()
  price: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
