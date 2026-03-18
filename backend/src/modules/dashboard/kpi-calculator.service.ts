import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Collection } from '../../common/types/collections.enum';
import {
  KpiResult,
  CollectionBreakdown,
  CollectionBreakdownItem,
} from './dto/metrics-response.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class KpiCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateMonthlyKpi(
    storeId: string,
    year: number,
    month: number,
  ): Promise<KpiResult> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Step 1: Count quotes for the month
    const quoteCount = await this.prisma.quote.count({
      where: {
        storeId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Step 2: Aggregate contracts (EXCLUDING CANCELLED)
    const contracts = await this.prisma.contract.findMany({
      where: {
        storeId,
        contractDate: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
      },
      include: { items: true },
    });

    const contractCount = contracts.length;
    const contractAmount = contracts.reduce(
      (sum, c) => sum + Number(c.totalAmount),
      0,
    );

    // Step 3: Calculate derived KPIs
    const conversionRate = quoteCount > 0 ? contractCount / quoteCount : 0;
    const avgOrderValue = contractCount > 0 ? contractAmount / contractCount : 0;

    // Step 4: Build collection breakdown
    const collectionBreakdown = this.buildCollectionBreakdown(contracts);

    // Step 5: Upsert to monthly_metrics
    await this.prisma.monthlyMetric.upsert({
      where: {
        storeId_year_month: { storeId, year, month },
      },
      update: {
        quoteCount,
        contractCount,
        contractAmount: new Decimal(contractAmount.toFixed(2)),
        conversionRate: new Decimal(conversionRate.toFixed(4)),
        avgOrderValue: new Decimal(avgOrderValue.toFixed(2)),
        collectionBreakdown: collectionBreakdown as any,
        calculatedAt: new Date(),
      },
      create: {
        storeId,
        year,
        month,
        quoteCount,
        contractCount,
        contractAmount: new Decimal(contractAmount.toFixed(2)),
        conversionRate: new Decimal(conversionRate.toFixed(4)),
        avgOrderValue: new Decimal(avgOrderValue.toFixed(2)),
        collectionBreakdown: collectionBreakdown as any,
        calculatedAt: new Date(),
      },
    });

    return {
      storeId,
      year,
      month,
      quoteCount,
      contractCount,
      contractAmount,
      conversionRate,
      avgOrderValue,
      collectionBreakdown,
    };
  }

  async calculateCollectionBreakdown(
    storeId: string,
    year: number,
    month: number,
  ): Promise<CollectionBreakdown> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const contracts = await this.prisma.contract.findMany({
      where: {
        storeId,
        contractDate: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
      },
      include: { items: true },
    });

    return this.buildCollectionBreakdown(contracts);
  }

  private buildCollectionBreakdown(
    contracts: Array<{
      items: Array<{
        collection: string;
        totalPrice: Decimal | number;
        quantity: number;
      }>;
    }>,
  ): CollectionBreakdown {
    const breakdown: CollectionBreakdown = {} as CollectionBreakdown;

    // Initialize all collections
    for (const col of Object.values(Collection)) {
      breakdown[col] = { totalAmount: 0, itemCount: 0, contractCount: 0 };
    }

    for (const contract of contracts) {
      const collectionsInContract = new Set<Collection>();

      for (const item of contract.items) {
        const collection = item.collection as Collection;
        breakdown[collection].totalAmount += Number(item.totalPrice);
        breakdown[collection].itemCount += item.quantity;
        collectionsInContract.add(collection);
      }

      // Increment contractCount for each collection present in this contract
      for (const col of collectionsInContract) {
        breakdown[col].contractCount += 1;
      }
    }

    return breakdown;
  }
}
