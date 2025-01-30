import { IsNotEmpty, IsString } from 'class-validator';

export class ChagnePasswordRequest {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
