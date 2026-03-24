import { Module } from '@nestjs/common';
import { SalesDataController, SalesDebugController } from './sales-data.controller';
import { SalesDataService } from './sales-data.service';

@Module({
  controllers: [SalesDataController, SalesDebugController],
  providers: [SalesDataService],
  exports: [SalesDataService],
})
export class SalesDataModule {}
