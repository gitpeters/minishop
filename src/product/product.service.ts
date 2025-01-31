import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryConfig } from 'src/config/cloudinary.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductRequest, ProductResponse } from './dto';
import {
  APIQuery,
  APIResponse,
  Pagination,
  PaginationResult,
} from 'src/common';
import { Product } from '@prisma/client';
import { UpdateProductRequest } from './dto/product.update.request';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryConfig,
  ) {}

  async findAllProducts(
    query: APIQuery,
  ): Promise<APIResponse<ProductResponse[] | []>> {
    const { page, limit, search, filter } = query;
    const pagination: Pagination = new Pagination(page, limit);

    const totalElements = await this.prisma.product.count();

    const products = await this.prisma.product.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          filter
            ? {
                category: {
                  name: { contains: filter, mode: 'insensitive' },
                },
              }
            : {},
        ],
      },
      skip: pagination.getSkip(),
      take: pagination.getTake(),
      orderBy: { createdAt: 'desc' },
      include: { category: true, images: true },
    });

    const responses = products.map((product) => {
      const categoryName = product.category?.name ?? null;
      const images = product.images?.map((img) => img.url) ?? [];
      return this.mapToProductResponse(product, categoryName, images);
    });

    const paginationResult = new PaginationResult(
      Math.ceil(totalElements / limit),
      limit,
      totalElements,
      responses.length,
    );
    return new APIResponse('success', responses, paginationResult);
  }

  async findProduct(productId: string): Promise<APIResponse<ProductResponse>> {
    const product = await this.prisma.product.findUnique({
      where: { publicId: productId },
      include: { category: true, images: true },
    });

    if (!product) throw new NotFoundException('No product found');

    const categoryName = product.category?.name ?? null;
    const images = product.images?.map((img) => img.url) ?? [];

    const response = this.mapToProductResponse(product, categoryName, images);

    return new APIResponse('success', response);
  }

  async deleteProduct(productId: string): Promise<void> {
    const productImages = await this.prisma.productImage.findMany({
      where: { productId },
    });
    if (productImages.length > 0) {
      await Promise.all(
        productImages.map((img) =>
          this.cloudinary.deleteFromCloudinary(img.publicId),
        ),
      );
    }
    await this.prisma.product.delete({ where: { publicId: productId } });
  }

  async createProduct(
    request: CreateProductRequest,
    files: Express.Multer.File[],
  ): Promise<APIResponse<ProductResponse>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }
    const uploadedImages = await this.cloudinary.uploadToCloudinary(files);
    try {
      // Create product with images in a single transaction
      const product = await this.prisma.$transaction(async (tx) => {
        // Create the product first
        const newProduct = await tx.product.create({
          data: {
            name: request.name,
            description: request.description,
            availableQuantity: Number(request.availableQuantity),
            price: BigInt(request.price),
            categoryId: request.categoryId,
          },
        });

        // Create product images
        await tx.productImage.createMany({
          data: uploadedImages.map((image) => ({
            url: image.url,
            publicId: image.publicId,
            originalFileName: image.originalFileName,
            productId: newProduct.publicId,
          })),
        });

        // Return product with images
        return await tx.product.findUnique({
          where: { id: newProduct.id },
          include: {
            images: true,
            category: true,
          },
        });
      });

      if (!product) {
        throw new InternalServerErrorException(
          'Failed to create product records',
        );
      }
      const categoryName = product.category?.name ?? null;
      const images = product.images?.map((img) => img.url) ?? [];

      const response = this.mapToProductResponse(product, categoryName, images);

      return new APIResponse('success', response);
    } catch (error) {
      this.logger.error(
        `Failed to create product with the following error: ${error}`,
      );
      // If anything fails, we should delete the uploaded images from Cloudinary
      if (error) {
        for (const image of uploadedImages) {
          await this.cloudinary.deleteFromCloudinary(image.publicId);
        }
      }
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Product with this name already exists!',
          );
        }
      }
      throw new InternalServerErrorException(`Failed to create product`);
    }
  }

  async updateProduct(
    productId: string,
    updateRequest: UpdateProductRequest,
    files: Express.Multer.File[] | null,
  ): Promise<APIResponse<ProductResponse>> {
    if (files && files.length > 0) {
      const productImages = await this.prisma.productImage.findMany({
        where: { productId },
      });
      if (productImages.length > 0) {
        await Promise.all(
          productImages.map((img) =>
            this.cloudinary.deleteFromCloudinary(img.publicId),
          ),
        );
        await this.prisma.productImage.deleteMany({ where: { productId } });
      }
      const uploadedImages = await this.cloudinary.uploadToCloudinary(files);
      await this.prisma.productImage.createMany({
        data: uploadedImages.map((image) => ({
          url: image.url,
          publicId: image.publicId,
          originalFileName: image.originalFileName,
          productId: productId,
        })),
      });
    }
    try {
      const updatedProduct = await this.prisma.product.update({
        where: { publicId: productId },
        data: {
          ...(updateRequest.name && { name: updateRequest.name }),
          ...(updateRequest.description && {
            description: updateRequest.description,
          }),
          ...(updateRequest.availableQuantity && {
            availableQuantity: Number(updateRequest.availableQuantity),
          }),
          ...(updateRequest.price && { price: BigInt(updateRequest.price) }),
          ...(updateRequest.categoryId && {
            categoryId: updateRequest.categoryId,
          }),
        },

        include: { category: true, images: true },
      });

      if (!updatedProduct) {
        throw new NotFoundException('Product not found');
      }
      const categoryName = updatedProduct.category?.name ?? null;
      const images = updatedProduct.images?.map((img) => img.url) ?? [];

      const response = this.mapToProductResponse(
        updatedProduct,
        categoryName,
        images,
      );

      return new APIResponse('success', response);
    } catch (error) {
      this.logger.error(
        `Failed to update product with the following error: ${error}`,
      );
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Product with this name already exists!',
          );
        }
      }
      throw new InternalServerErrorException(`Failed to update product`);
    }
  }

  private mapToProductResponse(
    product: Product,
    categoryName: string | null,
    images: string[] | [],
  ) {
    const response = new ProductResponse();

    response.publicId = product.publicId;
    response.name = product.name;
    response.price = Number(product.price);
    response.description = product.description;
    response.availableQuantity = product.availableQuantity;
    response.categoryName = categoryName;
    response.images = images;

    return response;
  }
}
