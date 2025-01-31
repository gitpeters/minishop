import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from 'src/guards';
import { CategoryService } from './category.service';
import { GetQuery, Roles } from 'src/decorators';
import { APIQuery } from 'src/common';
import { CreateCategoryRequest, UpdateCategory } from './dto';

@Controller('/api/v1/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'PRODUCT_MANAGER')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Post()
  async createCategory(@Body() createRequest: CreateCategoryRequest) {
    await this.service.createCategory(createRequest);
  }

  @Get()
  async getAllCategories(@GetQuery() query: APIQuery) {
    return await this.service.getAllCategories(query);
  }

  @Get('/:id')
  async getCategory(@Param('id') id: string) {
    return await this.service.getCategory(id);
  }

  @Patch('/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() uppateRequest: UpdateCategory,
  ) {
    return await this.service.updateCategory(id, uppateRequest);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(id);
  }
}
