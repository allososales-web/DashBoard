import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KpiCalculatorService } from './kpi-calculator.service';
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
  ) {}

  async getMetrics(
    storeId: string,
    year: number,
    month: number,
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

    // Fetch monthly goal for comparison
    const goal = await this.getGoalComparison(storeId, year, month, metrics);

    return { metrics, goal };
  }

  async recalculate(
    storeId: string,
    year: number,
    month: number,
  ): Promise<MetricsResponseDto> {
    const metrics = await this.kpiCalculator.calculateMonthlyKpi(storeId, year, month);
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

  async getAllStoresMetrics(year: number, month: number) {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const results = await Promise.all(
      stores.map(async (store) => {
        try {
          const metrics = await this.kpiCalculator.calculateMonthlyKpi(store.id, year, month);
          const consultCount = await this.prisma.consult.count({
            where: { storeId: store.id, createdAt: { gte: startOfMonth, lte: endOfMonth } },
          });
          return {
            storeName: store.name,
            storeCode: store.code,
            ...metrics,
            storeId: store.id,
            consultCount,
          };
        } catch {
          return {
            storeId: store.id,
            storeName: store.name,
            storeCode: store.code,
            quoteCount: 0,
            contractCount: 0,
            contractAmount: 0,
            conversionRate: 0,
            avgOrderValue: 0,
            consultCount: 0,
          };
        }
      }),
    );

    return results;
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
