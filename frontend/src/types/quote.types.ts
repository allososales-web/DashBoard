import { Collection } from './common.types';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface QuoteItem {
  id: string;
  productName: string;
  collection: Collection;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  notes?: string;
}

export interface Quote {
  id: string;
  storeId: string;
  consultId?: string;
  quoteNumber: string;
  customerName: string;
  totalAmount: number | string;
  status: QuoteStatus;
  validUntil?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItem[];
}

export interface CreateQuoteItemDto {
  productName: string;
  collection: Collection;
  quantity: number;
  unitPrice: number;
}

export interface CreateQuoteDto {
  customerName: string;
  consultId?: string;
  validUntil?: string;
  items: CreateQuoteItemDto[];
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {}

export interface QuoteListQuery {
  status?: QuoteStatus;
  page?: number;
  limit?: number;
}
