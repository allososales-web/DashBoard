import { Module } from '@nestjs/common';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SalesDataModule } from '../sales-data/sales-data.module';

@Module({
  imports: [PrismaModule, SalesDataModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
