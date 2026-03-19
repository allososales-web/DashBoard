export class StoreComparisonDto {
  storeId: string;
  storeName: string;
  storeCode: string;
  region: string | null;
  year: number;
  month: number;
  quoteCount: number;
  contractCount: number;
  contractAmount: number;
  conversionRate: number;
  avgOrderValue: number;
}

export class KpiTrendDto {
  storeId: string | null;
  storeName: string | null;
  year: number;
  month: number;
  quoteCount: number;
  contractCount: number;
  contractAmount: number;
  conversionRate: number;
  avgOrderValue: number;
}

export class CollectionAnalysisDto {
  storeId: string | null;
  storeName: string | null;
  year: number;
  month: number;
  collection: string;
  contractCount: number;
  totalAmount: number;
  itemCount: number;
}
