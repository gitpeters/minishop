import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as sharp from 'sharp';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CloudinaryConfig {
  private storage: multer.StorageEngine;
  private readonly logger = new Logger(CloudinaryConfig.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.storage = multer.memoryStorage();
  }

  private imageFileFilter(
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only image files are allowed! (JPEG, PNG, or WebP)'),
        false,
      );
    }
    callback(null, true);
  }

  getMulterUpload() {
    return multer({
      storage: this.storage,
      fileFilter: this.imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
      },
    }).array('images', 5);
  }

  private async processImage(file: Express.Multer.File) {
    try {
      const processed = await sharp(file.buffer)
        .resize(2000, 1333, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat('png')
        .toBuffer();
      this.logger.log(`Processing image: ${file.originalname}`);
      return processed;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async uploadToCloudinary(files: Express.Multer.File[]) {
    this.logger.log('Uploading images to cloudinary');
    if (!files || files.length === 0) {
      throw new BadRequestException('No images provided');
    }

    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed');
    }

    const uploadPromises = files.map(async (file) => {
      try {
        const processedBuffer = await this.processImage(file);

        // Convert buffer to base64 string for Cloudinary
        const base64String = processedBuffer.toString('base64');
        const uploadStr = `data:image/png;base64,${base64String}`;

        const result = await cloudinary.uploader.upload(uploadStr, {
          folder: 'products',
          public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
          resource_type: 'auto',
        });

        this.logger.log(`Completed image upload with result: ${result.url}`);

        return {
          url: result.secure_url,
          publicId: result.public_id,
          originalFileName: file.originalname,
          width: result.width,
          height: result.height,
        };
      } catch (error) {
        this.logger.error(
          `Failed to upload image ${file.originalname}: ${error.message}`,
        );
        throw new Error(
          `Failed to upload image ${file.originalname}: ${error.message}`,
        );
      }
    });

    return Promise.all(uploadPromises);
  }

  async deleteFromCloudinary(publicId: string) {
    this.logger.log(`About to delete image: ${publicId} from cloudinary`);
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}: ${error.message}`);
      throw new Error(`Failed to delete image ${publicId}: ${error.message}`);
    }
  }
}
