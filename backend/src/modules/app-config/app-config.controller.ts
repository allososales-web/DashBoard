import { Body, Controller, Get, Put } from '@nestjs/common';
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
}
