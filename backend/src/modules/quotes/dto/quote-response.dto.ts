import { Collection } from '../../../common/types/collections.enum';

export class QuoteItemResponseDto {
  id: string;
  quoteId: string;
  productName: string;
  collection: Collection;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
}

export class QuoteResponseDto {
  id: string;
  storeId: string;
  consultId: string | null;
  quoteNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  validUntil: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuoteItemResponseDto[];
}
