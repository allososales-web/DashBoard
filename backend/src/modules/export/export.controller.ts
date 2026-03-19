import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';

@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * GET /stores/:storeId/export/:resource
   * 매장 데이터 내보내기 (CSV)
   * Requirements: 19.3
   */
  @Get('stores/:storeId/export/:resource')
  @UseGuards(StoreAccessGuard)
  @Roles(Role.STORE_MANAGER)
  async exportStoreResource(
    @Param('storeId') storeId: string,
    @Param('resource') resource: string,
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.exportService.exportStoreResource(storeId, resource, 'csv', query);
    const filename = `${resource}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  }

  /**
   * GET /hq/export/:resource
   * HQ 데이터 내보내기 (CSV)
   * Requirements: 19.3
   */
  @Get('hq/export/:resource')
  @Roles(Role.HQ_ADMIN)
  async exportHqResource(
    @Param('resource') resource: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.exportService.exportHqResource(resource, 'csv');
    const filename = `hq-${resource}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  }
}
