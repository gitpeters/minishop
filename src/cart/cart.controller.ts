import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser, Roles } from 'src/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/guards';
import { CartService } from './cart.service';
import { AddToCartItem } from './dto';

@Controller('/api/v1/carts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post('/add')
  async addToCart(
    @GetUser('publicId') userId: string,
    @Body() dto: AddToCartItem,
  ) {
    return await this.service.addToCart(userId, dto);
  }

  @Post('/remove/:cartItemId')
  async removeFromCart(
    @GetUser('publicId') userId: string,
    @Param('cartItemId') cartItemId: string,
  ) {
    return await this.service.removeFromCart(userId, cartItemId);
  }

  @Get()
  async getUserCarts(@GetUser('publicId') userId: string) {
    return await this.service.getUserCarts(userId);
  }
}
