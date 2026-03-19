import { Controller, Get, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreComparisonQueryDto } from './dto/store-comparison-query.dto';
import { KpiTrendsQueryDto } from './dto/kpi-trends-query.dto';
import { CollectionAnalysisQueryDto } from './dto/collection-analysis-query.dto';

@Controller('insights')
@Roles(Role.HQ_ADMIN)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * GET /insights/stores/comparison
   * 매장 간 KPI 비교
   */
  @Get('stores/comparison')
  getStoreComparison(@Query() query: StoreComparisonQueryDto) {
    return this.insightsService.getStoreComparison(query);
  }

  /**
   * GET /insights/kpi/trends
   * KPI 트렌드 (월별 추이)
   */
  @Get('kpi/trends')
  getKpiTrends(@Query() query: KpiTrendsQueryDto) {
    return this.insightsService.getKpiTrends(query);
  }

  /**
   * GET /insights/collections/analysis
   * 컬렉션별 매출 분석
   */
  @Get('collections/analysis')
  getCollectionAnalysis(@Query() query: CollectionAnalysisQueryDto) {
    return this.insightsService.getCollectionAnalysis(query);
  }
}
