import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductRequest, UpdateProductRequest } from './dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard } from 'src/guards';
import { GetQuery, Roles } from 'src/decorators';
import { APIQuery } from 'src/common';

@Controller('/api/v1/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get()
  async findAllProducts(@GetQuery() query: APIQuery) {
    return await this.service.findAllProducts(query);
  }

  @Get('/:productId')
  async getProduct(@Param('productId') productId: string) {
    return await this.service.findProduct(productId);
  }

  @Post()
  @Roles('ADMIN', 'PRODUCT_MANAGER')
  @UseInterceptors(FilesInterceptor('images', 5))
  async createProduct(
    @Body() createProduct: CreateProductRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.createProduct(createProduct, files);
  }

  @Patch('/:productId')
  @Roles('ADMIN', 'PRODUCT_MANAGER')
  @UseInterceptors(FilesInterceptor('images', 5))
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updateRequest: UpdateProductRequest,
    @UploadedFiles() files: Express.Multer.File[] | null,
  ) {
    return await this.service.updateProduct(productId, updateRequest, files);
  }

  @Delete('/:productId')
  @Roles('ADMIN', 'PRODUCT_MANAGER')
  async deleteProduct(@Param('productId') productId: string) {
    await this.service.deleteProduct(productId);
  }
}
