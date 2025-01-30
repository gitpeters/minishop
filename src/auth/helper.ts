import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from 'argon2';
import { parseExpiration } from 'src/utils';
import { LoginResponse } from './dto';

@Injectable()
export class AuthHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async generateAccessToken(user: User, userRoles: string[]) {
    const payload = {
      sub: user.publicId,
      email: user.email,
      accessType: 'accessToken',
      permissions: userRoles,
    };

    const accessTokenExpireAt = this.config.get<string>(
      'ACCESS_TOKEN_EXPIRE_AT',
      '1d',
    );
    const refreshTokenExpireAt = this.config.get<string>(
      'REFRESH_TOKEN_EXPIRE_AT',
      '7d',
    );
    try {
      const accessToken = await this.jwt.signAsync(payload, {
        expiresIn: accessTokenExpireAt,
        secret: this.config.get<string>('ACCESS_TOKEN_SECRET'),
        algorithm: 'HS256',
      });

      const userId = user.publicId;

      const refreshToken = await this.jwt.signAsync(
        { userId, accessType: 'refreshToken' },
        {
          expiresIn: refreshTokenExpireAt,
          secret: this.config.get<string>('REFRESH_TOKEN_SECRET'),
          algorithm: 'HS256',
        },
      );

      const hashedRefreshToken = await argon.hash(refreshToken);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      const accessTokenExpirationDate = new Date(
        Date.now() + parseExpiration(accessTokenExpireAt),
      );
      const refreshTokenExpirationDate = new Date(
        Date.now() + parseExpiration(refreshTokenExpireAt),
      );

      const loginResponse: LoginResponse = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        accessTokenExpiredAt: accessTokenExpirationDate,
        refreshTokenExpiredAt: refreshTokenExpirationDate,
      };

      return loginResponse;
    } catch (error) {
      throw new Error('Failed to generate token');
    }
  }
}
