import { IsNumber, IsString, Min } from 'class-validator';

export class AddToCartItem {
  @IsString()
  productId: string;
  @IsNumber()
  @Min(1)
  quantity: number;
}
