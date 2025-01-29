import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserRoleModule } from './user-role/user-role.module';
import { MailerModule } from './mailer/mailer.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UserRoleModule, MailerModule],
})
export class AppModule {}
