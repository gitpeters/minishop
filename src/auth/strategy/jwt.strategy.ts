import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>(
        'ACCESS_TOKEN_SECRET',
        'ACCESS_TOKEN_SECRET',
      ),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or corrupt access token');
    }

    if (user.isAccountDeleted) {
      throw new UnauthorizedException('User account is deleted');
    }

    if (user.changedPasswordAt) {
      const passwordChangedTimestamp = user.changedPasswordAt.getTime() / 1000;

      if (payload.iat < passwordChangedTimestamp) {
        throw new UnauthorizedException(
          'Password was recently changed. Please log in again.',
        );
      }
    }
    return {
      publicId: user.publicId,
      roles: user.roles.map((role) => role.role.name),
    };
  }
}
