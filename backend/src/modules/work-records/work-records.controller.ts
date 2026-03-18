import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { WorkRecordsService } from './work-records.service';
import { UpsertWorkRecordDto } from './dto/work-record.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('work-records')
export class WorkRecordsController {
  constructor(private readonly service: WorkRecordsService) {}

  @Public()
  @Get('store/:storeId')
  async getMonthly(
    @Param('storeId') storeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getMonthlyRecords(storeId, parseInt(year), parseInt(month));
  }

  @Public()
  @Post('store/:storeId')
  async upsert(@Param('storeId') storeId: string, @Body() dto: UpsertWorkRecordDto) {
    return this.service.upsertRecord(storeId, dto);
  }

  @Public()
  @Get('hq/all')
  async getAllStores(@Query('year') year: string, @Query('month') month: string) {
    return this.service.getAllStoresMonthly(parseInt(year), parseInt(month));
  }
}
