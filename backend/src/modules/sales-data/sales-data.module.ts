import { Module } from '@nestjs/common';
import { SalesDataController } from './sales-data.controller';
import { SalesDataService } from './sales-data.service';

@Module({
  controllers: [SalesDataController],
  providers: [SalesDataService],
  exports: [SalesDataService],
})
export class SalesDataModule {}
