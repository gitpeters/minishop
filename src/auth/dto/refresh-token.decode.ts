export interface RefreshTokenDecode {
  userId: string;
  accessType: string;
  iat: number;
  exp: number;
}
