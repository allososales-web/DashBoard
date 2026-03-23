import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DataMode = 'ORDER' | 'SALES';

export interface SalesKpiResult {
  orderAmount: number;
  salesAmount: number;
  orderCount: number;
  seriesBreakdown: Record<string, { amount: number; count: number }>;
}

@Injectable()
export class SalesKpiService {
  constructor(private prisma: PrismaService) {}

  async calculateSalesKpi(
    storeId: string | null,
    year: number,
    month: number,
    dataMode: DataMode = 'ORDER',
    referenceDate?: Date,
  ): Promise<SalesKpiResult> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Resolve alias names for the store
    let aliasNames: string[] | null = null;
    if (storeId) {
      const mappings = await this.prisma.storeAliasMapping.findMany({
        where: { storeId },
        select: { aliasName: true },
      });
      aliasNames = mappings.map((m) => m.aliasName);
      if (aliasNames.length === 0) {
        return { orderAmount: 0, salesAmount: 0, orderCount: 0, seriesBreakdown: {} };
      }
    }

    const aliasFilter = aliasNames ? { storeAlias: { in: aliasNames } } : {};

    // ORDER mode: filter by orderDate
    const orderRows = await this.prisma.salesRawData.findMany({
      where: {
        ...aliasFilter,
        orderDate: { gte: startDate, lt: endDate },
      },
      select: { orderAmount: true, quantity: true, seriesCode: true },
    });

    // SALES mode: filter by confirmedDate <= referenceDate within month
    const salesFilter: any = {
      ...aliasFilter,
      confirmedDate: { gte: startDate, lt: endDate },
    };
    if (referenceDate) {
      salesFilter.confirmedDate = {
        gte: startDate,
        lte: referenceDate,
      };
    }

    const salesRows = await this.prisma.salesRawData.findMany({
      where: salesFilter,
      select: { orderAmount: true, quantity: true, seriesCode: true },
    });

    const sumAmount = (rows: { orderAmount: any; quantity: number }[]) =>
      rows.reduce((acc, r) => acc + Number(r.orderAmount), 0);

    const orderAmount = sumAmount(orderRows);
    const salesAmount = sumAmount(salesRows);
    const orderCount = orderRows.reduce((acc, r) => acc + r.quantity, 0);

    // Series breakdown based on active dataMode
    const activeRows = dataMode === 'ORDER' ? orderRows : salesRows;
    const seriesBreakdown: Record<string, { amount: number; count: number }> = {};
    for (const row of activeRows) {
      const key = row.seriesCode || '기타';
      if (!seriesBreakdown[key]) seriesBreakdown[key] = { amount: 0, count: 0 };
      seriesBreakdown[key].amount += Number(row.orderAmount);
      seriesBreakdown[key].count += row.quantity;
    }

    return { orderAmount, salesAmount, orderCount, seriesBreakdown };
  }
}
