import { Collection } from './common.types';

export type DataMode = 'ORDER' | 'SALES';

export interface KpiResult {
  storeId: string;
  year: number;
  month: number;
  visitCount?: number;
  consultCount?: number;
  quoteCount: number;
  contractCount: number;
  contractAmount: number | string;
  conversionRate: number | string;
  avgOrderValue: number | string;
  collectionBreakdown: CollectionBreakdown;
  // Sales raw data fields
  orderAmount?: number;
  salesAmount?: number;
  orderCount?: number;
  dataMode?: DataMode;
}

export interface CollectionBreakdownItem {
  totalAmount: number | string;
  itemCount: number;
  contractCount: number;
}

export type CollectionBreakdown = Record<Collection, CollectionBreakdownItem>;

export interface MonthlyGoalComparison {
  targetAmount: number | string;
  targetContracts: number;
  targetConsults: number;
  achievementRate: {
    amountRate: number;
    contractRate: number;
    consultRate: number;
  };
}

export interface MetricsResponse {
  metrics: KpiResult;
  goal?: MonthlyGoalComparison | null;
}
