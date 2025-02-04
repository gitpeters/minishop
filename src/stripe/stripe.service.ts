import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeCheckout } from './dto';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private stripeKey: string;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_API_KEY', 'DEFAULT_KEY'),
      {
        apiVersion: '2025-01-27.acacia',
      },
    );
  }

  // Create a payment intent for checkout
  async createPaymentIntent(
    amount: number, // amount in cents
    currency: string = 'usd',
  ) {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });
  }

  async createCheckoutSession(dto: StripeCheckout) {
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: dto.success_url,
      cancel_url: dto.cancel_url,
      customer_email: dto.customer_email,
      client_reference_id: dto.client_reference_id,
      line_items: dto.line_items,
    });
  }

  // Verify and confirm payment
  async confirmPayment(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  // Refund a payment
  async refundPayment(paymentIntentId: string, amount?: number) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // optional, defaults to full amount
    });
  }
}
