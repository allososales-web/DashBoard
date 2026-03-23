import { Collection } from '../../../common/types/collections.enum';

export interface CollectionBreakdownItem {
  totalAmount: number;
  itemCount: number;
  contractCount: number;
}

export type CollectionBreakdown = Record<Collection, CollectionBreakdownItem>;

export interface KpiResult {
  storeId: string;
  year: number;
  month: number;
  quoteCount: number;
  contractCount: number;
  contractAmount: number;
  conversionRate: number;
  avgOrderValue: number;
  collectionBreakdown: CollectionBreakdown;
  // Sales raw data fields (optional)
  orderAmount?: number;
  salesAmount?: number;
  orderCount?: number;
  dataMode?: string;
}

export interface MonthlyGoalComparison {
  targetAmount: number;
  targetContracts: number;
  targetConsults: number;
  achievementRate: {
    amountRate: number;
    contractRate: number;
    consultRate: number;
  };
}

export interface MetricsResponseDto {
  metrics: KpiResult;
  goal?: MonthlyGoalComparison | null;
}
