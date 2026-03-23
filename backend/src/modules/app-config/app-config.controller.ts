import { Body, Controller, Get, Post, Put, Request } from '@nestjs/common';
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

  /** 납기일정 구글 시트 URL 반환 */
  @Get('delivery-sheet-url')
  getDeliverySheetUrl() {
    return this.appConfigService.getDeliverySheetUrl();
  }
}
