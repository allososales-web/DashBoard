import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KpiCalculatorService } from './kpi-calculator.service';
import { SalesKpiService, DataMode } from './sales-kpi.service';
import {
  KpiResult,
  MetricsResponseDto,
  MonthlyGoalComparison,
} from './dto/metrics-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpiCalculator: KpiCalculatorService,
    private readonly salesKpi: SalesKpiService,
  ) {}

  async getMetrics(
    storeId: string,
    year: number,
    month: number,
    dataMode?: DataMode,
  ): Promise<MetricsResponseDto> {
    // Try to find cached monthly_metrics
    const cached = await this.prisma.monthlyMetric.findUnique({
      where: { storeId_year_month: { storeId, year, month } },
    });

    let metrics: KpiResult;

    if (cached) {
      metrics = {
        storeId: cached.storeId,
        year: cached.year,
        month: cached.month,
        quoteCount: cached.quoteCount,
        contractCount: cached.contractCount,
        contractAmount: Number(cached.contractAmount),
        conversionRate: Number(cached.conversionRate),
        avgOrderValue: Number(cached.avgOrderValue),
        collectionBreakdown: (cached.collectionBreakdown as any) ?? {},
      };
    } else {
      metrics = await this.kpiCalculator.calculateMonthlyKpi(storeId, year, month);
    }

    // Append sales raw data KPIs if dataMode provided
    if (dataMode) {
      const salesKpi = await this.salesKpi.calculateSalesKpi(storeId, year, month, dataMode);
      metrics.orderAmount = salesKpi.orderAmount;
      metrics.salesAmount = salesKpi.salesAmount;
      metrics.orderCount = salesKpi.orderCount;
      metrics.salesCount = salesKpi.salesCount;
      metrics.dataMode = dataMode;
    }

    // Fetch monthly goal for comparison
    const goal = await this.getGoalComparison(storeId, year, month, metrics);

    return { metrics, goal };
  }

  async recalculate(
    storeId: string,
    year: number,
    month: number,
    dataMode?: DataMode,
  ): Promise<MetricsResponseDto> {
    const metrics = await this.kpiCalculator.calculateMonthlyKpi(storeId, year, month);
    if (dataMode) {
      const salesKpi = await this.salesKpi.calculateSalesKpi(storeId, year, month, dataMode);
      metrics.orderAmount = salesKpi.orderAmount;
      metrics.salesAmount = salesKpi.salesAmount;
      metrics.orderCount = salesKpi.orderCount;
      metrics.salesCount = salesKpi.salesCount;
      metrics.dataMode = dataMode;
    }
    const goal = await this.getGoalComparison(storeId, year, month, metrics);
    return { metrics, goal };
  }

  async getKpiSummary(
    storeId: string,
    months: number = 6,
  ): Promise<KpiResult[]> {
    const now = new Date();
    const results: KpiResult[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const metric = await this.prisma.monthlyMetric.findUnique({
        where: { storeId_year_month: { storeId, year, month } },
      });

      if (metric) {
        results.push({
          storeId: metric.storeId,
          year: metric.year,
          month: metric.month,
          quoteCount: metric.quoteCount,
          contractCount: metric.contractCount,
          contractAmount: Number(metric.contractAmount),
          conversionRate: Number(metric.conversionRate),
          avgOrderValue: Number(metric.avgOrderValue),
          collectionBreakdown: (metric.collectionBreakdown as any) ?? {},
        });
      }
    }

    return results;
  }

  async getAllStoresMetrics(year: number, month: number, dataMode?: DataMode) {
    // salesKpi에서 직접 전체 매장 KPI 계산 (항상 수주/매출 모두 포함)
    const storeKpis = await this.salesKpi.calculateAllStoresKpi(year, month);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const results = await Promise.all(
      storeKpis.map(async (sk) => {
        try {
          const consultCount = await this.prisma.consult.count({
            where: { storeId: sk.storeId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
          });
          return {
            storeId: sk.storeId,
            storeName: sk.storeName,
            storeCode: sk.storeCode,
            orderAmount: sk.orderAmount,
            salesAmount: sk.salesAmount,
            orderCount: sk.orderCount,
            salesCount: sk.salesCount,
            contractAmount: dataMode === 'SALES' ? sk.salesAmount : sk.orderAmount,
            contractCount: dataMode === 'SALES' ? sk.salesCount : sk.orderCount,
            quoteCount: 0,
            conversionRate: 0,
            channel: sk.channel,
            consultCount,
          };
        } catch {
          return {
            storeId: sk.storeId,
            storeName: sk.storeName,
            storeCode: sk.storeCode,
            orderAmount: 0,
            salesAmount: 0,
            orderCount: 0,
            salesCount: 0,
            contractAmount: 0,
            contractCount: 0,
            quoteCount: 0,
            conversionRate: 0,
            channel: sk.channel,
            consultCount: 0,
          };
        }
      }),
    );

    return results;
  }

  async getWeeklyKpi(storeId: string | null, year: number, month: number) {
    return this.salesKpi.calculateWeeklyKpi(storeId, year, month);
  }

  async getSeriesTop(year: number, month: number, dataMode?: DataMode) {
    return this.salesKpi.calculateSeriesTop(year, month, dataMode ?? 'ORDER');
  }

  async getStoreSeriesKpi(storeId: string, year: number, month: number, dataMode?: DataMode) {
    return this.salesKpi.calculateStoreSeriesKpi(storeId, year, month, dataMode ?? 'ORDER');
  }

  private async getGoalComparison(
    storeId: string,
    year: number,
    month: number,
    metrics: KpiResult,
  ): Promise<MonthlyGoalComparison | null> {
    const goal = await this.prisma.monthlyGoal.findUnique({
      where: { storeId_year_month: { storeId, year, month } },
    });

    if (!goal) {
      return null;
    }

    const targetAmount = Number(goal.targetAmount);
    const targetContracts = goal.targetContracts;
    const targetConsults = goal.targetConsults;

    return {
      targetAmount,
      targetContracts,
      targetConsults,
      achievementRate: {
        amountRate: targetAmount > 0
          ? (metrics.contractAmount / targetAmount) * 100
          : 0,
        contractRate: targetContracts > 0
          ? (metrics.contractCount / targetContracts) * 100
          : 0,
        consultRate: targetConsults > 0
          ? (metrics.quoteCount / targetConsults) * 100
          : 0,
      },
    };
  }
}
