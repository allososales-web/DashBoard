import { Collection } from './common.types';

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
