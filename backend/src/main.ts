import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ─── CORS ───
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  let originConfig: boolean | string | string[];
  if (corsOrigin === '*') {
    originConfig = true; // 모든 origin 허용
  } else {
    const list = corsOrigin.split(',').map((o) => o.trim());
    // 항상 Vercel 도메인 포함
    const vercelDomain = 'https://dash-board-flame-seven.vercel.app';
    if (!list.includes(vercelDomain)) list.push(vercelDomain);
    originConfig = list;
  }
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
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── Server ───
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on http://0.0.0.0:${port}`);
  logger.log(`CORS origin: ${corsOrigin}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}
bootstrap();
