import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddToCartItem,
  CartItemResponse,
  CartResponse,
  CheckoutResponse,
} from './dto';
import { APIResponse } from 'src/common';
import { CartItem, PaymentStatus, Product, User } from '@prisma/client';
import { generateRandomString } from 'src/utils';
import { StripeService } from 'src/stripe/stripe.service';
import {
  LineItem,
  PriceData,
  ProductData,
  StripeCheckout,
} from 'src/stripe/dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addToCart(
    userId: string,
    dto: AddToCartItem,
  ): Promise<APIResponse<CartResponse>> {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { items: { include: { product: true } } },
    });

    // check if product exists and if still in stock
    const product = await this.prisma.product.findUnique({
      where: { publicId: dto.productId },
    });

    if (!product) throw new NotFoundException('Product not found');

    if (product.availableQuantity < dto.quantity)
      throw new BadRequestException('Product currently out of stock');

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.publicId,
        productId: dto.productId,
      },
      include: { product: true },
    });

    if (existingItem) {
      // Update existing item
      await this.prisma.cartItem.update({
        where: { publicId: existingItem.publicId },
        data: {
          quantity: existingItem.quantity + dto.quantity,
        },
        include: { product: true },
      });
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          productId: dto.productId,
          cartId: cart.publicId,
          quantity: dto.quantity,
        },
        include: { product: true },
      });
    }

    // Refetch the entire cart to get updated items
    const updatedCart = await this.prisma.cart.findUnique({
      where: { publicId: cart.publicId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!updatedCart) throw new NotFoundException('Cart not found');

    const subTotal = this.calculateSubTotal(updatedCart.items);
    const itemResponse = updatedCart.items.map((item) =>
      this.mapToItemResponse(
        item.publicId,
        item.product.publicId,
        Number(item.product.price),
        item.product.name,
        item.quantity,
      ),
    );

    const response = this.mapToCartResponse(
      updatedCart.publicId,
      itemResponse,
      subTotal,
    );
    return new APIResponse('success', response);
  }

  async removeFromCart(
    userId: string,
    cartItemId: string,
  ): Promise<APIResponse<CartResponse>> {
    // Find the specific cart item to delete
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        publicId: cartItemId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Product not found in cart');
    }

    // Delete the specific cart item
    await this.prisma.cartItem.delete({
      where: {
        publicId: cartItem.publicId,
      },
    });

    // Refetch the updated cart
    const updatedCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!updatedCart) {
      throw new NotFoundException('Cart not found');
    }

    const subTotal = this.calculateSubTotal(updatedCart.items);

    const itemResponse = updatedCart.items.map((item) =>
      this.mapToItemResponse(
        item.publicId,
        item.product.publicId,
        Number(item.product.price),
        item.product.name,
        item.quantity,
      ),
    );

    const response = this.mapToCartResponse(
      updatedCart.publicId,
      itemResponse,
      subTotal,
    );

    return new APIResponse('success', response);
  }

  async getUserCarts(userId: string): Promise<APIResponse<CartResponse>> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      throw new NotFoundException('User cart is empty');
    }

    const subTotal = this.calculateSubTotal(cart.items);
    const itemResponse = cart.items.map((item) =>
      this.mapToItemResponse(
        item.publicId,
        item.product.publicId,
        Number(item.product.price),
        item.product.name,
        item.quantity,
      ),
    );

    const response = this.mapToCartResponse(
      cart.publicId,
      itemResponse,
      subTotal,
    );
    return new APIResponse('success', response);
  }

  private calculateSubTotal(
    items: (CartItem & { product: Product })[],
  ): number {
    return items.reduce((total, item) => {
      return total + Number(item.product.price) * item.quantity;
    }, Number(0));
  }

  private mapToItemResponse(
    id: string,
    productId: string,
    amount: number,
    productName: string,
    quanity: number,
  ): CartItemResponse {
    return { id, amount, productId, productName, quanity };
  }

  private mapToCartResponse(
    id: string,
    items: CartItemResponse[],
    subTotal: number,
  ): CartResponse {
    return { id, items, subTotal };
  }
}
