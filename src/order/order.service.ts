import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartItem, Order, PaymentStatus, Product, User } from '@prisma/client';
import { CheckoutResponse } from 'src/cart/dto';
import { APIResponse } from 'src/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  StripeCheckout,
  LineItem,
  PriceData,
  ProductData,
} from 'src/stripe/dto';
import { StripeService } from 'src/stripe/stripe.service';
import { generateRandomString, transformBigInts } from 'src/utils';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  async checkout(
    userId: string,
    cartId: string,
  ): Promise<APIResponse<CheckoutResponse<any>>> {
    const cart = await this.prisma.cart.findUnique({
      where: { publicId: cartId, userId: userId },
      include: {
        items: {
          include: { product: true },
        },
        user: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const orderRef = `ORD-${generateRandomString(10)}`;

    const checkoutDto = this.buildStripeCheckoutDto(
      cart.items,
      cart.user,
      orderRef,
    );

    const checkoutSession =
      await this.stripe.createCheckoutSession(checkoutDto);

    // Start transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId,
          reference: orderRef,
          orderDate: new Date(),
        },
      });

      // Create order lines and update product quantities
      for (const item of cart.items) {
        // Check stock availability again
        const product = await tx.product.findUnique({
          where: { publicId: item.productId },
        });

        if (!product || product.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for product: ${product?.name}`,
          );
        }

        // Create order line
        await tx.orderLine.create({
          data: {
            orderId: order.publicId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });

        // Update product quantity
        await tx.product.update({
          where: { publicId: item.productId },
          data: {
            availableQuantity: product.availableQuantity - item.quantity,
          },
        });
      }

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: order.publicId,
          amount: BigInt(this.calculateSubTotal(cart.items)),
          status: PaymentStatus.PENDING,
          reference: checkoutSession.id,
        },
      });

      // Clear the cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.publicId },
      });

      // delete cart
      await tx.cart.delete({
        where: { publicId: cart.publicId },
      });

      const completeOrder = await tx.order.findUnique({
        where: { publicId: order.publicId },
        include: {
          orderLines: {
            include: { product: true },
          },
          payment: true,
        },
      });

      // Transform BigInt to Number before returning
      return transformBigInts(completeOrder);
    });

    const checkoutResponse = new CheckoutResponse();
    checkoutResponse.checkoutUrl = checkoutSession.url;
    checkoutResponse.order = order;

    return new APIResponse('success', checkoutResponse);
  }

  async getOrderByRef(orderRef: string): Promise<APIResponse<Order>> {
    const order = await this.prisma.order.findFirst({
      where: { reference: orderRef },
      include: {
        orderLines: {
          include: { product: true },
        },
        payment: true,
      },
    });

    if (!order)
      throw new NotFoundException('No order found for this reference');

    return new APIResponse('success', transformBigInts(order));
  }

  async confirmPayment(sessionId: string): Promise<APIResponse<any>> {
    const stripeSession = await this.stripe.confirmPayment(sessionId);
    if (stripeSession.payment_status === 'paid') {
      const payment = await this.prisma.payment.update({
        where: { reference: sessionId },
        data: { status: PaymentStatus.PAID },
      });
      const order = await this.prisma.order.findUnique({
        where: { publicId: payment.orderId },
        include: { payment: true },
      });

      return new APIResponse('success', transformBigInts(order));
    }
    const payment = await this.prisma.payment.findFirst({
      where: { reference: sessionId },
    });
    return new APIResponse('success', transformBigInts(payment));
  }

  private buildStripeCheckoutDto(
    items: (CartItem & { product: Product })[],
    user: User,
    orderRef: string,
  ) {
    const baseUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:8090';

    const checkoutDto = new StripeCheckout();
    checkoutDto.success_url = `${baseUrl}/api/v1/orders/${orderRef}`;
    checkoutDto.cancel_url = `${baseUrl}/api/v1/orders/${orderRef}`;
    checkoutDto.customer_email = user.email;
    checkoutDto.client_reference_id = user.publicId;
    const lineItems = items.map((item) => {
      const dto = new LineItem();
      dto.quantity = item.quantity;
      const priceData = new PriceData();
      priceData.currency = 'NGN';
      priceData.unit_amount = Number(item.product.price) * 100;
      const productData = new ProductData();
      productData.name = item.product.name;
      priceData.product_data = productData;
      dto.price_data = priceData;
      return dto;
    });
    checkoutDto.line_items = lineItems;

    return checkoutDto;
  }

  private calculateSubTotal(
    items: (CartItem & { product: Product })[],
  ): number {
    return items.reduce((total, item) => {
      return total + Number(item.product.price) * item.quantity;
    }, Number(0));
  }
}
