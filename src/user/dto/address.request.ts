import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddressRequest {
  @IsString()
  @IsOptional()
  houseNumber?: string;
  @IsString()
  @IsOptional()
  street?: string;
  @IsString()
  @IsNotEmpty()
  city: string;
  @IsString()
  @IsNotEmpty()
  country: string;
}
