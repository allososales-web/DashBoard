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

// HQ 전체 매장 대시보드 (별도 컨트롤러)
@Controller('dashboard')
export class HqDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('all')
  @Roles(Role.HQ_ADMIN)
  getAllMetrics(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('dataMode') dataMode?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.dashboardService.getAllStoresMetrics(y, m, dataMode as any);
  }

  @Get('weekly')
  @Roles(Role.HQ_ADMIN)
  getWeeklyKpi(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('storeIds') storeIds?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const ids = storeIds ? storeIds.split(',').filter(Boolean) : null;
    return this.dashboardService.getWeeklyKpi(null, y, m, ids);
  }

  // 매장 사용자도 접근 가능한 전체 순위 엔드포인트 (금액 노출 없이 순위만)
  @Get('store-rank')
  @Roles(Role.READONLY)
  getStoreRank(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('dataMode') dataMode?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.dashboardService.getAllStoresMetrics(y, m, dataMode as any);
  }

  // 시리즈별 TOP (품목별 매출/건수/평균단가)
  @Get('series-top')
  @Roles(Role.READONLY)
  getSeriesTop(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('dataMode') dataMode?: string,
    @Query('endMonth') endMonth?: string,
    @Query('storeIds') storeIds?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const em = endMonth ? parseInt(endMonth, 10) : undefined;
    const ids = storeIds ? storeIds.split(',').filter(Boolean) : null;
    return this.dashboardService.getSeriesTop(y, m, dataMode as any, em, ids);
  }

  // 품목별 매장 breakdown (시리즈별 매장 순위)
  @Get('series-store-breakdown')
  @Roles(Role.HQ_ADMIN)
  getSeriesStoreBreakdown(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('dataMode') dataMode?: string,
    @Query('endMonth') endMonth?: string,
    @Query('storeIds') storeIds?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const em = endMonth ? parseInt(endMonth, 10) : undefined;
    const ids = storeIds ? storeIds.split(',').filter(Boolean) : null;
    return this.dashboardService.getSeriesStoreBreakdown(y, m, dataMode as any, em, ids);
  }
}

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
    return this.dashboardService.getMetrics(storeId, year, month, query.dataMode);
  }

  @Get('metrics/:year/:month')
  @Roles(Role.READONLY)
  getMetricsByMonth(
    @Param('storeId') storeId: string,
    @Param('year') year: string,
    @Param('month') month: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.dashboardService.getMetrics(
      storeId,
      parseInt(year, 10),
      parseInt(month, 10),
      query.dataMode,
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
    return this.dashboardService.recalculate(storeId, year, month, query.dataMode);
  }

  @Get('kpi/summary')
  @Roles(Role.READONLY)
  getKpiSummary(
    @Param('storeId') storeId: string,
    @Query() query: KpiSummaryQueryDto,
  ) {
    return this.dashboardService.getKpiSummary(storeId, query.months ?? 6);
  }

  @Get('kpi/weekly')
  @Roles(Role.READONLY)
  getWeeklyKpi(
    @Param('storeId') storeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.dashboardService.getWeeklyKpi(storeId, y, m);
  }

  @Get('series-kpi')
  @Roles(Role.READONLY)
  getSeriesKpi(
    @Param('storeId') storeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('dataMode') dataMode?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.dashboardService.getStoreSeriesKpi(storeId, y, m, dataMode as any);
  }
}
