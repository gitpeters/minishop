export class LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiredAt?: Date;
  refreshTokenExpiredAt?: Date;
}
