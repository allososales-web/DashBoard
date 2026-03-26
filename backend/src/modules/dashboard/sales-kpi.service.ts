import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DataMode = 'ORDER' | 'SALES';

export interface SalesKpiResult {
  orderAmount: number;       // ?�주?�자 기�? ?�주?��?*?�량 ?�계
  salesAmount: number;       // ?�정?�기 기�? ?�주?��?*?�량 ?�계
  orderCount: number;        // ?�주 건수 (distinct itemName)
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
  orderCount: number;        // distinct itemName 기�? (?�주?�자)
  salesCount: number;        // distinct itemName 기�? (?�정?�기)
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

    // ?�주: orderDate 기�? (null?�면 confirmedDate fallback)
    const orderRows = await this.prisma.salesRawData.findMany({
      where: {
        ...aliasFilter,
        itemCode: { not: { startsWith: 'DELIVERY_' } },
        orderAmount: { gt: 0 },
        OR: [
          { orderDate: { gte: startDate, lt: endDate } },
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment`n          // @ts-ignore`n          { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
        ],
      },
      select: { orderAmount: true, quantity: true, seriesCode: true, itemName: true, orderNumber: true },
    });

    // 매출: confirmedDate 기�?
    const salesRows = await this.prisma.salesRawData.findMany({
      where: {
        ...aliasFilter,
        itemCode: { not: { startsWith: 'DELIVERY_' } },
        orderAmount: { gt: 0 },
        confirmedDate: { gte: startDate, lt: endDate },
      },
      select: { orderAmount: true, quantity: true, seriesCode: true, itemName: true, orderNumber: true },
    });

    const sumAmount = (rows: { orderAmount: any; orderNumber: string }[]) => {
      // distinct orderNumber 기�??�로 금액 ?�산 (같�? ?�주번호????번만)
      const seen = new Map<string, number>();
      for (const r of rows) {
        if (!seen.has(r.orderNumber)) {
          seen.set(r.orderNumber, Number(r.orderAmount));
        }
      }
      return [...seen.values()].reduce((acc, v) => acc + v, 0);
    };

    // ?�주건수: distinct orderNumber (0???�외)
    const distinctOrderCount = (rows: { orderNumber: string }[]) =>
      new Set(rows.map((r) => r.orderNumber).filter(Boolean)).size;

    const orderAmount = sumAmount(orderRows);
    const salesAmount = sumAmount(salesRows);
    const orderCount = distinctOrderCount(orderRows);
    const salesCount = distinctOrderCount(salesRows);

    // Series breakdown
    const activeRows = dataMode === 'ORDER' ? orderRows : salesRows;
    const seriesBreakdown: Record<string, { amount: number; count: number }> = {};
    for (const row of activeRows) {
      const key = row.seriesCode || '기�?';
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
    storeIds?: string[] | null,
  ): Promise<WeeklyKpiResult[]> {
    const daysInMonth = new Date(year, month, 0).getDate();

    // storeIds가 주어지면 해당 매장들의 alias를 모두 수집
    let aliasFilter: any = {};
    if (storeIds && storeIds.length > 0) {
      const mappings = await this.prisma.storeAliasMapping.findMany({
        where: { storeId: { in: storeIds } },
        select: { aliasName: true },
      });
      const aliases = mappings.map((m) => m.aliasName);
      if (aliases.length === 0) return [];
      aliasFilter = { storeAlias: { in: aliases } };
    } else if (storeId) {
      const aliasNames = await this.resolveAliases(storeId);
      if (aliasNames !== null && aliasNames.length === 0) return [];
      if (aliasNames) aliasFilter = { storeAlias: { in: aliasNames } };
    }

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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment`n          // @ts-ignore`n          { orderDate: null, confirmedDate: { gte: wStart, lt: wEnd } },
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

  /** 시리즈별 TOP (품목별 매출/건수/평균단가) - 기간 범위 지원 */
  async calculateSeriesTop(year: number, month: number, dataMode: DataMode = 'ORDER', endMonth?: number, storeIds?: string[] | null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, (endMonth ?? month), 1);

    // storeIds 필터: 해당 매장들의 alias만 포함
    let aliasFilter: any = {};
    if (storeIds && storeIds.length > 0) {
      const mappings = await this.prisma.storeAliasMapping.findMany({
        where: { storeId: { in: storeIds } },
        select: { aliasName: true },
      });
      const aliases = mappings.map((m) => m.aliasName);
      if (aliases.length === 0) return [];
      aliasFilter = { storeAlias: { in: aliases } };
    }

    const baseFilter = { ...aliasFilter, itemCode: { not: { startsWith: 'DELIVERY_' } } };

    const rows = await this.prisma.salesRawData.findMany({
      where: dataMode === 'SALES'
        ? { ...baseFilter, confirmedDate: { gte: startDate, lt: endDate } }
        : {
            ...baseFilter,
            OR: [
              { orderDate: { gte: startDate, lt: endDate } },
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment`n          // @ts-ignore`n          { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
            ],
          },
      select: { seriesCode: true, orderAmount: true, itemName: true },
    });

    // ?�리즈별 집계: amount ?�계, distinct itemName ??
    const map: Record<string, { amount: number; itemNames: Set<string> }> = {};
    for (const row of rows) {
      const key = row.seriesCode?.trim() || '기�?';
      if (!map[key]) map[key] = { amount: 0, itemNames: new Set() };
      map[key].amount += Number(row.orderAmount);
      if (row.itemName) map[key].itemNames.add(row.itemName);
    }

    return Object.entries(map).map(([series, v]) => ({
      series,
      amount: v.amount,
      count: v.itemNames.size,
      avgPrice: v.itemNames.size > 0 ? Math.round(v.amount / v.itemNames.size) : 0,
    }));
  }

  /** 품목별 매장 breakdown (시리즈별 매장 순위) - 기간 범위 지원 */
  async calculateSeriesStoreBreakdown(year: number, month: number, dataMode: DataMode = 'ORDER', endMonth?: number, storeIds?: string[] | null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, (endMonth ?? month), 1);

    // storeIds 필터
    let aliasFilter: any = {};
    if (storeIds && storeIds.length > 0) {
      const mappings = await this.prisma.storeAliasMapping.findMany({
        where: { storeId: { in: storeIds } },
        select: { aliasName: true },
      });
      const aliases = mappings.map((m) => m.aliasName);
      if (aliases.length === 0) return [];
      aliasFilter = { storeAlias: { in: aliases } };
    }

    const baseFilter = { ...aliasFilter, itemCode: { not: { startsWith: 'DELIVERY_' } } };

    const rows = await this.prisma.salesRawData.findMany({
      where: dataMode === 'SALES'
        ? { ...baseFilter, confirmedDate: { gte: startDate, lt: endDate } }
        : {
            ...baseFilter,
            OR: [
              { orderDate: { gte: startDate, lt: endDate } },
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment`n          // @ts-ignore`n          { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
            ],
          },
      select: { seriesCode: true, orderAmount: true, storeAlias: true },
    });

    // storeAlias ??storeId 매핑 (storeAliasMapping ?�이�??�용)
    const allMappings = await this.prisma.storeAliasMapping.findMany({
      select: { aliasName: true, storeId: true, store: { select: { name: true } } },
    });
    const aliasToStore: Record<string, { id: string; name: string }> = {};
    for (const m of allMappings) {
      aliasToStore[m.aliasName.trim()] = { id: m.storeId, name: (m.store as any)?.name ?? m.storeId };
    }

    // series ??store ??amount 집계
    const map: Record<string, Record<string, { storeName: string; amount: number; count: number }>> = {};
    for (const row of rows) {
      const series = row.seriesCode?.trim() || '기�?';
      const storeInfo = row.storeAlias ? aliasToStore[row.storeAlias.trim()] : null;
      if (!storeInfo) continue;
      if (!map[series]) map[series] = {};
      if (!map[series][storeInfo.id]) map[series][storeInfo.id] = { storeName: storeInfo.name, amount: 0, count: 0 };
      map[series][storeInfo.id].amount += Number(row.orderAmount);
      map[series][storeInfo.id].count += 1;
    }

    return Object.entries(map).map(([series, storeMap]) => ({
      series,
      stores: Object.entries(storeMap)
        .map(([storeId, v]) => ({ storeId, storeName: v.storeName, amount: v.amount, count: v.count }))
        .sort((a, b) => b.amount - a.amount),
    }));
  }

  /** ?�정 매장???�리즈별 KPI */
  async calculateStoreSeriesKpi(storeId: string, year: number, month: number, dataMode: DataMode = 'ORDER') {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const aliasNames = await this.resolveAliases(storeId);
    if (aliasNames !== null && aliasNames.length === 0) {
      return { series: [], orderAmount: 0, salesAmount: 0, orderCount: 0, salesCount: 0 };
    }

    const aliasFilter = aliasNames ? { storeAlias: { in: aliasNames } } : {};
    const baseFilter = { ...aliasFilter, itemCode: { not: { startsWith: 'DELIVERY_' } } };

    const orderRows = await this.prisma.salesRawData.findMany({
      where: {
        ...baseFilter,
        OR: [
          { orderDate: { gte: startDate, lt: endDate } },
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment`n          // @ts-ignore`n          { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
        ],
      },
      select: { orderAmount: true, quantity: true, seriesCode: true, itemName: true },
    });

    const salesRows = await this.prisma.salesRawData.findMany({
      where: { ...baseFilter, confirmedDate: { gte: startDate, lt: endDate } },
      select: { orderAmount: true, quantity: true, seriesCode: true, itemName: true },
    });

    const activeRows = dataMode === 'SALES' ? salesRows : orderRows;

    const map: Record<string, { amount: number; itemNames: Set<string> }> = {};
    for (const row of activeRows) {
      const key = row.seriesCode?.trim() || '기�?';
      if (!map[key]) map[key] = { amount: 0, itemNames: new Set() };
      map[key].amount += Number(row.orderAmount);
      if (row.itemName) map[key].itemNames.add(row.itemName);
    }

    const series = Object.entries(map)
      .map(([name, v]) => ({
        series: name,
        amount: v.amount,
        count: v.itemNames.size,
        avgPrice: v.itemNames.size > 0 ? Math.round(v.amount / v.itemNames.size) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const sumAmount = (rows: { orderAmount: any }[]) =>
      rows.reduce((acc, r) => acc + Number(r.orderAmount), 0);
    const distinctCount = (rows: { itemName: string | null }[]) =>
      new Set(rows.map((r) => r.itemName).filter(Boolean)).size;

    return {
      series,
      orderAmount: sumAmount(orderRows),
      salesAmount: sumAmount(salesRows),
      orderCount: distinctCount(orderRows),
      salesCount: distinctCount(salesRows),
    };
  }

  /** ?�체 매장�?KPI */
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
          aliasName: '', orderAmount: 0, salesAmount: 0, orderCount: 0, salesCount: 0,
          channel: store.defaultChannel ?? 'ROAD',
        });
        continue;
      }

      const baseFilter = {
        storeAlias: { in: aliases },
        itemCode: { not: { startsWith: 'DELIVERY_' } },
        orderAmount: { gt: 0 },
      };

      const orderRows = await this.prisma.salesRawData.findMany({
        where: {
          ...baseFilter,
          OR: [
            { orderDate: { gte: startDate, lt: endDate } },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment`n          // @ts-ignore`n          { orderDate: null, confirmedDate: { gte: startDate, lt: endDate } },
          ],
        },
        select: { orderAmount: true, orderNumber: true },
      });

      const salesRows = await this.prisma.salesRawData.findMany({
        where: { ...baseFilter, confirmedDate: { gte: startDate, lt: endDate } },
        select: { orderAmount: true, orderNumber: true },
      });

      // distinct orderNumber 기�? 금액 ?�산 (같�? ?�주번호????번만)
      const sumDistinct = (rows: { orderAmount: any; orderNumber: string }[]) => {
        const seen = new Map<string, number>();
        for (const r of rows) {
          if (!seen.has(r.orderNumber)) seen.set(r.orderNumber, Number(r.orderAmount));
        }
        return [...seen.values()].reduce((s, v) => s + v, 0);
      };

      results.push({
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        aliasName: aliases[0],
        orderAmount: sumDistinct(orderRows),
        salesAmount: sumDistinct(salesRows),
        orderCount: new Set(orderRows.map((r) => r.orderNumber).filter(Boolean)).size,
        salesCount: new Set(salesRows.map((r) => r.orderNumber).filter(Boolean)).size,
        channel: store.defaultChannel ?? 'ROAD',
      });
    }

    return results;
  }
}
