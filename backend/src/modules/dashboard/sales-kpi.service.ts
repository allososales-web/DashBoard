import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DataMode = 'ORDER' | 'SALES';

export interface SalesKpiResult {
  orderAmount: number;       // 수주일자 기준 수주단가*수량 합계
  salesAmount: number;       // 확정납기 기준 수주단가*수량 합계
  orderCount: number;        // 수주 건수 (distinct itemName)
  salesCount: number;        // 매출 건수 (distinct itemName)
  seriesBreakdown: Record<string, { amount: number; count: number }>;
}

export interface WeeklyKpiResult {
  week: number;              // 1~5
  startDay: number;
  endDay: number;
  orderAmount: number;
  salesAmount: number;
}

export interface StoreKpiResult {
  storeId: string;
  storeName: string;
  storeCode: string;
  aliasName: string;
  orderAmount: number;
  salesAmount: number;
  orderCount: number;        // distinct itemName 기준
  channel: string;
}

@Injectable()
export class SalesKpiService {
  constructor(private prisma: PrismaService) {}

  private async resolveAliases(storeId: string | null): Promise<string[] | null> {
    if (!storeId) return null;
    const mappings = await this.prisma.storeAliasMapping.findMany({
      where: { storeId },
      select: { aliasName: true },
    });
    return mappings.map((m) => m.aliasName);
  }

  async calculateSalesKpi(
    storeId: string | null,
    year: number,
    month: number,
    dataMode: DataMode = 'ORDER',
  ): Promise<SalesKpiResult> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const aliasNames = await this.resolveAliases(storeId);
    if (aliasNames !== null && aliasNames.length === 0) {
      return { orderAmount: 0, salesAmount: 0, orderCount: 0, salesCount: 0, seriesBreakdown: {} };
    }

    const aliasFilter = aliasNames ? { storeAlias: { in: aliasNames } } : {};

    // 수주: orderDate 기준 (null이면 confirmedDate fallback)
    const orderRows = await this.prisma.salesRawData.findMany({
      where: {
        ...aliasFilter,
        itemCode: { not: { startsWith: 'DELIVERY_' } },
        OR: [
          { orderDate: { gte: startDate, lt: endDate } },
          { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
        ],
      },
      select: { orderAmount: true, quantity: true, seriesCode: true, itemName: true },
    });

    // 매출: confirmedDate 기준
    const salesRows = await this.prisma.salesRawData.findMany({
      where: {
        ...aliasFilter,
        itemCode: { not: { startsWith: 'DELIVERY_' } },
        confirmedDate: { gte: startDate, lt: endDate },
      },
      select: { orderAmount: true, quantity: true, seriesCode: true, itemName: true },
    });

    const sumAmount = (rows: { orderAmount: any }[]) =>
      rows.reduce((acc, r) => acc + Number(r.orderAmount), 0);

    const distinctCount = (rows: { itemName: string | null }[]) =>
      new Set(rows.map((r) => r.itemName).filter(Boolean)).size;

    const orderAmount = sumAmount(orderRows);
    const salesAmount = sumAmount(salesRows);
    const orderCount = distinctCount(orderRows);
    const salesCount = distinctCount(salesRows);

    // Series breakdown
    const activeRows = dataMode === 'ORDER' ? orderRows : salesRows;
    const seriesBreakdown: Record<string, { amount: number; count: number }> = {};
    for (const row of activeRows) {
      const key = row.seriesCode || '기타';
      if (!seriesBreakdown[key]) seriesBreakdown[key] = { amount: 0, count: 0 };
      seriesBreakdown[key].amount += Number(row.orderAmount);
      seriesBreakdown[key].count += 1;
    }

    return { orderAmount, salesAmount, orderCount, salesCount, seriesBreakdown };
  }

  /** 주차별 KPI (해당 월의 주차별 수주/매출 합계) */
  async calculateWeeklyKpi(
    storeId: string | null,
    year: number,
    month: number,
  ): Promise<WeeklyKpiResult[]> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const aliasNames = await this.resolveAliases(storeId);
    if (aliasNames !== null && aliasNames.length === 0) return [];

    const aliasFilter = aliasNames ? { storeAlias: { in: aliasNames } } : {};
    const baseFilter = { ...aliasFilter, itemCode: { not: { startsWith: 'DELIVERY_' } } };

    // 주차 구분: 1~7, 8~14, 15~21, 22~28, 29~말일
    const weeks = [
      { week: 1, start: 1, end: 7 },
      { week: 2, start: 8, end: 14 },
      { week: 3, start: 15, end: 21 },
      { week: 4, start: 22, end: 28 },
      { week: 5, start: 29, end: daysInMonth },
    ].filter((w) => w.start <= daysInMonth);

    const results: WeeklyKpiResult[] = [];
    for (const w of weeks) {
      const wStart = new Date(year, month - 1, w.start);
      const wEnd = new Date(year, month - 1, w.end + 1);

      const orderRows = await this.prisma.salesRawData.findMany({
        where: {
          ...baseFilter,
          OR: [
            { orderDate: { gte: wStart, lt: wEnd } },
            { orderDate: null, confirmedDate: { gte: wStart, lt: wEnd } },
          ],
        },
        select: { orderAmount: true },
      });

      const salesRows = await this.prisma.salesRawData.findMany({
        where: { ...baseFilter, confirmedDate: { gte: wStart, lt: wEnd } },
        select: { orderAmount: true },
      });

      results.push({
        week: w.week,
        startDay: w.start,
        endDay: Math.min(w.end, daysInMonth),
        orderAmount: orderRows.reduce((s, r) => s + Number(r.orderAmount), 0),
        salesAmount: salesRows.reduce((s, r) => s + Number(r.orderAmount), 0),
      });
    }
    return results;
  }

  /** 전체 매장별 KPI */
  async calculateAllStoresKpi(year: number, month: number): Promise<StoreKpiResult[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, defaultChannel: true },
    });

    const mappings = await this.prisma.storeAliasMapping.findMany({
      select: { storeId: true, aliasName: true },
    });

    const results: StoreKpiResult[] = [];

    for (const store of stores) {
      const aliases = mappings.filter((m) => m.storeId === store.id).map((m) => m.aliasName);
      if (aliases.length === 0) {
        results.push({
          storeId: store.id, storeName: store.name, storeCode: store.code,
          aliasName: '', orderAmount: 0, salesAmount: 0, orderCount: 0,
          channel: store.defaultChannel ?? 'ROAD',
        });
        continue;
      }

      const baseFilter = {
        storeAlias: { in: aliases },
        itemCode: { not: { startsWith: 'DELIVERY_' } },
      };

      const orderRows = await this.prisma.salesRawData.findMany({
        where: {
          ...baseFilter,
          OR: [
            { orderDate: { gte: startDate, lt: endDate } },
            { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
          ],
        },
        select: { orderAmount: true, itemName: true },
      });

      const salesRows = await this.prisma.salesRawData.findMany({
        where: { ...baseFilter, confirmedDate: { gte: startDate, lt: endDate } },
        select: { orderAmount: true },
      });

      results.push({
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        aliasName: aliases[0],
        orderAmount: orderRows.reduce((s, r) => s + Number(r.orderAmount), 0),
        salesAmount: salesRows.reduce((s, r) => s + Number(r.orderAmount), 0),
        orderCount: new Set(orderRows.map((r) => r.itemName).filter(Boolean)).size,
        channel: store.defaultChannel ?? 'ROAD',
      });
    }

    return results;
  }
}
