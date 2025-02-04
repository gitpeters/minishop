import { Global, Module } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Global()
@Module({
  exports: [StripeService],
  providers: [StripeService],
})
export class StripeModule {}
