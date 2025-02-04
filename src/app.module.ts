import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserRoleModule } from './user-role/user-role.module';
import { MailerModule } from './mailer/mailer.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { StripeService } from './stripe/stripe.service';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserRoleModule,
    MailerModule,
    UserModule,
    CategoryModule,
    ProductModule,
    OrderModule,
    CartModule,
    StripeModule,
  ],
  providers: [StripeService],
})
export class AppModule {}
