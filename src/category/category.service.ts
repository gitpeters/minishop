import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryResponse, CreateCategoryRequest, UpdateCategory } from './dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  APIQuery,
  APIResponse,
  Pagination,
  PaginationResult,
} from 'src/common';
import { Category } from '@prisma/client';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(createRequest: CreateCategoryRequest): Promise<void> {
    try {
      await this.prisma.category.create({
        data: createRequest,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create category with this error: ${err.message}`,
      );
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002')
          throw new BadRequestException('Category name already exists');
      }
    }
  }

  async updateCategory(
    publicId: string,
    updateRequest: UpdateCategory,
  ): Promise<APIResponse<CategoryResponse>> {
    try {
      const category = await this.prisma.category.update({
        where: { publicId },
        data: { ...updateRequest },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const response = this.mapToCategoryResponse(category);
      return new APIResponse('success', response);
    } catch (err) {
      this.logger.error(
        `Failed to update category with this error: ${err.message}`,
      );
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002')
          throw new BadRequestException('Category name already exists');
      }
    }
    throw new InternalServerErrorException('Failed to update category');
  }

  async getAllCategories(
    query: APIQuery,
  ): Promise<APIResponse<CategoryResponse[] | []>> {
    const { page, limit, search } = query;
    const pagination: Pagination = new Pagination(page, limit);
    const totalElements = await this.prisma.category.count();
    const categories = await this.prisma.category.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      skip: pagination.getSkip(),
      take: pagination.getTake(),
      orderBy: { createdAt: 'desc' },
    });

    const responses = categories
      ? categories.map((category) => this.mapToCategoryResponse(category))
      : [];
    const paginationResult = new PaginationResult(
      Math.ceil(totalElements / limit),
      limit,
      totalElements,
      responses.length,
    );
    return new APIResponse('success', responses, paginationResult);
  }

  async getCategory(publicId: string): Promise<APIResponse<CategoryResponse>> {
    const category = await this.prisma.category.findUnique({
      where: { publicId },
    });

    if (!category) throw new NotFoundException('Category not found');

    const response = this.mapToCategoryResponse(category);

    return new APIResponse('success', response);
  }

  async deleteCategory(publicId: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { publicId } });
    } catch (err) {
      this.logger.error(
        `Failed to delete category with this error: ${err.message}`,
      );
      throw new InternalServerErrorException('Failed to delete category');
    }
  }

  private mapToCategoryResponse(category: Category): CategoryResponse {
    const res = new CategoryResponse();
    res.publicId = category.publicId;
    res.name = category.name;
    res.description = category.description;
    return res;
  }
}
