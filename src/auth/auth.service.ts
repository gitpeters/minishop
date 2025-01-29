import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  SignupRequest,
} from './dto';

import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRoleService } from 'src/user-role/user-role.service';
import { AssignRole } from 'src/user-role/dto';
import { MailerService } from 'src/mailer/mailer.service';
import { generateRandomDigit, generateRandomString } from 'src/utils';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: UserRoleService,
    private readonly mailer: MailerService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(request: SignupRequest): Promise<void> {
    try {
      const hashedPassword = await argon.hash(request.password);
      const user = await this.prisma.user.create({
        data: { ...request, password: hashedPassword },
      });
      const role = await this.roleService.findRoleByName('USER');
      const assginRequest: AssignRole = new AssignRole();
      assginRequest.rolePublicId = role.publicId;
      assginRequest.userPublicId = user.publicId;
      await this.roleService.assignUserToRole(assginRequest);
      const verificationToken = user.id + generateRandomString(10);
      const hashedToken = await argon.hash(verificationToken);
      const tokenExpiredAt = new Date(Date.now() + 10 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: hashedToken,
          tokenExpiredAt: tokenExpiredAt,
        },
      });
      this.mailer.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      this.logger.error(
        'Error occurred while signing up user: ',
        error.message,
      );
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException(
            'User with email address already exist on our system.',
          );
        }
      }
    }
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: request.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    const isPasswordVerified = await argon.verify(
      user.password,
      request.password,
    );

    if (!isPasswordVerified) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    if (!user.isEnabled) {
      throw new ForbiddenException('Account not verified');
    }

    if (user.isAccountDeleted) {
      throw new ForbiddenException('Account is currently disabled');
    }

    const userRoles = user.roles.map((role) => role.role.name);
    return this.generateAccessToken(user, userRoles);
  }

  async verifyAccount(token: string): Promise<LoginResponse> {
    if (!token) {
      throw new UnauthorizedException('Invalid verification token');
    }
    const userId = parseInt(token.split('')[0], 10);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or corrupt token provided');
    }
    await this.verifyToken(token, user);

    await this.prisma.user.update({
      where: { id: userId },
      data: { isEnabled: true },
    });
    const userRoles = user.roles.map((role) => role.role.name);
    return this.generateAccessToken(user, userRoles);
  }

  async resetPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = user.id + generateRandomDigit(5);
    const hashOTP = await argon.hash(otp);
    await this.prisma.user.update({
      where: { email: email },
      data: {
        verificationToken: hashOTP,
        tokenExpiredAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    this.mailer.sendPasswordResetEmail(email, otp, user.firstName);
  }

  async confirmPasswordReset(
    request: ResetPasswordRequest,
  ): Promise<LoginResponse> {
    const userId = parseInt(request.otp.split('')[0], 10);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or corrupt token provided');
    }

    await this.verifyToken(request.otp, user);

    const hashedPassword = await argon.hash(request.password);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isEnabled: true,
        password: hashedPassword,
        changedPasswordAt: new Date(Date.now()),
      },
    });
    const userRoles = user.roles.map((role) => role.role.name);
    return this.generateAccessToken(user, userRoles);
  }

  private async generateAccessToken(user: User, userRoles: string[]) {
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
        Date.now() +
          parseInt(accessTokenExpireAt.split('')[0], 10) * 60 * 60 * 1000,
      );

      const refreshTokenExpirationDate = new Date(
        Date.now() +
          parseInt(refreshTokenExpireAt.split('')[0], 10) * 60 * 60 * 1000,
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

  private async verifyToken(token: string, user: User) {
    if (!user.verificationToken) {
      throw new UnauthorizedException('Verification token has expired');
    }
    const isTokenVerified = await argon.verify(user.verificationToken, token);

    if (!isTokenVerified) {
      throw new UnauthorizedException('Invalid or corrupt verification token');
    }
    const tokenIssueDate = user.tokenExpiredAt;
    if (!tokenIssueDate) {
      throw new UnauthorizedException('Verification Token has expired');
    }
    const currentDateTimestamp = new Date(Date.now()).getTime();
    const tokenIssueTimestamp = tokenIssueDate.getTime();

    if (currentDateTimestamp > tokenIssueTimestamp) {
      throw new UnauthorizedException('Verification Token has expired');
    }
  }
}
