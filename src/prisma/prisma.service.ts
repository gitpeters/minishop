import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { generateRandomString } from 'src/utils';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
    });
  }
  async onModuleInit() {
    this.$use(async (params, next) => {
      // Check if the operation is 'create' or 'update' on the 'Role' model
      if (
        params.model === 'Role' &&
        (params.action === 'create' || params.action === 'update')
      ) {
        const data = params.args.data;

        if (data.name) {
          data.name = data.name.replace(/ /g, '_').toUpperCase();
          data.name = data.name.toUpperCase();
        }
      }

      return next(params);
    });
  }
}
