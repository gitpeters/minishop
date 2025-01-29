import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const config = app.get(ConfigService);

  const port = config.get<number>('SERVER_PORT', 3000);
  await app.listen(port ?? 3000);
  console.log(`Application is started on port:${port}`);
}
bootstrap();
