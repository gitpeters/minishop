import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { GetUser, Roles } from 'src/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/guards';

@Controller('/api/v1/orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Post('/purchase/:cartId')
  async checkout(
    @GetUser('publicId') userId: string,
    @Param('cartId') cartId: string,
  ) {
    return await this.service.checkout(userId, cartId);
  }

  @Get('/:orderRef')
  async getOrderByRef(@Param('orderRef') orderRef: string) {
    return await this.service.getOrderByRef(orderRef);
  }

  @Patch('/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER', 'MANAGER')
  async confirmPayment(@Param('sessionId') sessionId: string) {
    return await this.service.confirmPayment(sessionId);
  }
}
