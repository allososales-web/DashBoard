import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ─── CORS ───
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const originConfig = corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim());
  app.enableCors({
    origin: originConfig,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global Pipes ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── Global Filters ───
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Server ───
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`CORS origin: ${corsOrigin}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}
bootstrap();
