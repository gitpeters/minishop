import {
  BadRequestException,
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
  RefreshTokenDecode,
  ResetPasswordRequest,
  SignupRequest,
} from './dto';

import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRoleService } from 'src/user-role/user-role.service';
import { AssignRole } from 'src/user-role/dto';
import { MailerService } from 'src/mailer/mailer.service';
import {
  generateRandomDigit,
  generateRandomString,
  parseExpiration,
} from 'src/utils';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APIResponse } from 'src/common';
import { AuthHelper } from './helper';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: UserRoleService,
    private readonly mailer: MailerService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly helper: AuthHelper,
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

  async resendVerificationToken(email: string): Promise<void> {
    if (!email) throw new BadRequestException('Email address is required');

    const user = await this.prisma.user.findUnique({ where: { email: email } });

    if (!user) throw new NotFoundException('User not found');

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
  }

  async login(request: LoginRequest): Promise<APIResponse<LoginResponse>> {
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
    const loginResponse = await this.helper.generateAccessToken(
      user,
      userRoles,
    );
    const hashedRefreshToken = await argon.hash(loginResponse.refreshToken);
    this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });
    return new APIResponse('success', loginResponse);
  }

  async verifyAccount(token: string): Promise<APIResponse<LoginResponse>> {
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
      data: { isEnabled: true, verificationToken: null, tokenExpiredAt: null },
    });
    const userRoles = user.roles.map((role) => role.role.name);
    const loginResponse = await this.helper.generateAccessToken(
      user,
      userRoles,
    );
    return new APIResponse('success', loginResponse);
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
  ): Promise<APIResponse<LoginResponse>> {
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
        verificationToken: null,
        tokenExpiredAt: null,
        password: hashedPassword,
        changedPasswordAt: new Date(Date.now()),
      },
    });
    const userRoles = user.roles.map((role) => role.role.name);
    const loginResponse = await this.helper.generateAccessToken(
      user,
      userRoles,
    );
    return new APIResponse('success', loginResponse);
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<APIResponse<LoginResponse>> {
    const decoded: RefreshTokenDecode = this.jwt.decode(refreshToken);

    if (!decoded || !decoded.userId) {
      throw new UnauthorizedException('Invalid or malformed refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { publicId: decoded.userId },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or malformed refresh token');
    }

    if (!user.refreshToken) {
      throw new UnauthorizedException('Invalid or malformed refresh token');
    }

    const isTokenVerified = await argon.verify(user.refreshToken, refreshToken);

    if (!isTokenVerified) {
      throw new UnauthorizedException('Invalid or malformed refresh token');
    }

    if (user.isAccountDeleted) {
      throw new ForbiddenException('User account has been deactivated');
    }

    if (user.changedPasswordAt) {
      const passwordChangedTimestamp = user.changedPasswordAt.getTime() / 1000;

      if (decoded.iat < passwordChangedTimestamp) {
        throw new UnauthorizedException(
          'Password was recently changed. Please log in again.',
        );
      }
    }

    const userRoles = user.roles.map((role) => role.role.name);

    const loginResponse = await this.helper.generateAccessToken(
      user,
      userRoles,
    );
    return new APIResponse('success', loginResponse);
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
