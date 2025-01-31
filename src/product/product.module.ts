import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CloudinaryConfig } from 'src/config/cloudinary.config';

@Module({
  providers: [ProductService, CloudinaryConfig],
  controllers: [ProductController],
})
export class ProductModule {}
