import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { MetricsQueryDto, KpiSummaryQueryDto } from './dto/metrics-query.dto';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';

@Controller('stores/:storeId')
@UseGuards(StoreAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles(Role.READONLY)
  getMetrics(
    @Param('storeId') storeId: string,
    @Query() query: MetricsQueryDto,
  ) {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    return this.dashboardService.getMetrics(storeId, year, month);
  }

  @Get('metrics/:year/:month')
  @Roles(Role.READONLY)
  getMetricsByMonth(
    @Param('storeId') storeId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.dashboardService.getMetrics(
      storeId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Post('metrics/recalculate')
  @Roles(Role.STORE_MANAGER)
  recalculate(
    @Param('storeId') storeId: string,
    @Query() query: MetricsQueryDto,
  ) {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    return this.dashboardService.recalculate(storeId, year, month);
  }

  @Get('kpi/summary')
  @Roles(Role.READONLY)
  getKpiSummary(
    @Param('storeId') storeId: string,
    @Query() query: KpiSummaryQueryDto,
  ) {
    return this.dashboardService.getKpiSummary(storeId, query.months ?? 6);
  }
}
