import { Body, Controller, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';

@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get('urls')
  getUrls() {
    return this.appConfigService.getUrls();
  }

  @Put('urls')
  @Roles(Role.HQ_ADMIN)
  saveUrls(@Body() dto: { deliveryUrl?: string; loginInfoUrl?: string; salesUrl?: string }) {
    return this.appConfigService.saveUrls(dto);
  }

  /** 구글 시트 매출 실적 동기화 */
  @Post('sync-sales-sheet')
  @Roles(Role.HQ_ADMIN)
  syncSalesSheet(@Request() req: any) {
    return this.appConfigService.syncSalesFromSheet(req.user?.id);
  }

  /** 매출 실적 CSV 컬럼 미리보기 (디버그) */
  @Get('preview-sales-csv')
  @Roles(Role.HQ_ADMIN)
  previewSalesCsv() {
    return this.appConfigService.previewSalesCsvColumns();
  }

  /** 납기일정 구글 시트 URL 반환 */
  @Get('delivery-sheet-url')
  getDeliverySheetUrl() {
    return this.appConfigService.getDeliverySheetUrl();
  }

  /** 구글 시트 납기일정 동기화 */
  @Post('sync-delivery-sheet')
  @Roles(Role.HQ_ADMIN)
  syncDeliverySheet(@Request() req: any) {
    return this.appConfigService.syncDeliveryFromSheet(req.user?.id);
  }

  /** 매장별 납기일정 조회 */
  @Get('delivery-schedule/:storeId')
  getDeliverySchedule(
    @Param('storeId') storeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.appConfigService.getDeliverySchedule(storeId, Number(year), Number(month));
  }
}
