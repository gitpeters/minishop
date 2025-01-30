import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateAddressRequest {
  @IsString()
  @IsOptional()
  houseNumber?: string;
  @IsString()
  @IsOptional()
  street?: string;
  @IsString()
  @IsOptional()
  city?: string;
  @IsString()
  @IsOptional()
  country?: string;
}
