import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreComparisonQueryDto } from './dto/store-comparison-query.dto';
import { KpiTrendsQueryDto } from './dto/kpi-trends-query.dto';
import { CollectionAnalysisQueryDto } from './dto/collection-analysis-query.dto';
import {
  StoreComparisonDto,
  KpiTrendDto,
  CollectionAnalysisDto,
} from './dto/insights-response.dto';

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매장 간 KPI 비교 (monthly_metrics 기반)
   * Requirements 19.1
   */
  async getStoreComparison(query: StoreComparisonQueryDto): Promise<StoreComparisonDto[]> {
    const { year, month, region, storeIds } = query;

    const storeWhere: any = { isActive: true };
    if (region) storeWhere.region = region;
    if (storeIds && storeIds.length > 0) storeWhere.id = { in: storeIds };

    const metrics = await this.prisma.monthlyMetric.findMany({
      where: {
        year,
        month,
        store: storeWhere,
      },
      include: {
        store: {
          select: { id: true, name: true, code: true, region: true },
        },
      },
      orderBy: { contractAmount: 'desc' },
    });

    return metrics.map((m) => ({
      storeId: m.storeId,
      storeName: m.store.name,
      storeCode: m.store.code,
      region: m.store.region,
      year: m.year,
      month: m.month,
      quoteCount: m.quoteCount,
      contractCount: m.contractCount,
      contractAmount: Number(m.contractAmount),
      conversionRate: Number(m.conversionRate),
      avgOrderValue: Number(m.avgOrderValue),
    }));
  }

  /**
   * KPI 트렌드 (월별 추이)
   * Requirements 19.2
   */
  async getKpiTrends(query: KpiTrendsQueryDto): Promise<KpiTrendDto[]> {
    const { storeId, startYear, startMonth, endYear, endMonth } = query;

    // 기간 내 (year, month) 조합 필터링
    const metrics = await this.prisma.monthlyMetric.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
        OR: this.buildYearMonthRange(startYear, startMonth, endYear, endMonth),
      },
      include: {
        store: { select: { id: true, name: true } },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    return metrics.map((m) => ({
      storeId: m.storeId,
      storeName: m.store.name,
      year: m.year,
      month: m.month,
      quoteCount: m.quoteCount,
      contractCount: m.contractCount,
      contractAmount: Number(m.contractAmount),
      conversionRate: Number(m.conversionRate),
      avgOrderValue: Number(m.avgOrderValue),
    }));
  }

  /**
   * 컬렉션별 매출 분석
   */
  async getCollectionAnalysis(query: CollectionAnalysisQueryDto): Promise<CollectionAnalysisDto[]> {
    const { year, month, storeId } = query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 취소되지 않은 계약의 항목만 집계
    const items = await this.prisma.contractItem.findMany({
      where: {
        contract: {
          status: { not: 'CANCELLED' },
          contractDate: { gte: startDate, lte: endDate },
          ...(storeId ? { storeId } : {}),
        },
      },
      include: {
        contract: {
          select: {
            storeId: true,
            store: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 컬렉션 × 매장별 집계
    const aggregated = new Map<string, CollectionAnalysisDto>();

    for (const item of items) {
      const key = storeId
        ? `${item.contract.storeId}-${item.collection}`
        : `ALL-${item.collection}`;

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          storeId: storeId ? item.contract.storeId : null,
          storeName: storeId ? item.contract.store.name : null,
          year,
          month,
          collection: item.collection,
          contractCount: 0,
          totalAmount: 0,
          itemCount: 0,
        });
      }

      const entry = aggregated.get(key)!;
      entry.totalAmount += Number(item.totalPrice);
      entry.itemCount += item.quantity;
    }

    // contractCount: 해당 컬렉션 항목을 포함한 계약 수
    const contractIds = new Map<string, Set<string>>();
    for (const item of items) {
      const key = storeId
        ? `${item.contract.storeId}-${item.collection}`
        : `ALL-${item.collection}`;
      if (!contractIds.has(key)) contractIds.set(key, new Set());
      contractIds.get(key)!.add(item.contractId);
    }

    for (const [key, entry] of aggregated.entries()) {
      entry.contractCount = contractIds.get(key)?.size ?? 0;
    }

    return Array.from(aggregated.values()).sort((a, b) =>
      b.totalAmount - a.totalAmount,
    );
  }

  /**
   * 기간 범위를 Prisma OR 조건으로 변환
   */
  private buildYearMonthRange(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
  ): Array<{ year: number; month: number }> {
    const conditions: Array<{ year: number; month: number }> = [];
    let y = startYear;
    let m = startMonth;

    while (y < endYear || (y === endYear && m <= endMonth)) {
      conditions.push({ year: y, month: m });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return conditions;
  }
}
