import { Collection } from './common.types';

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ContractItem {
  id: string;
  productName: string;
  collection: Collection;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
}

export interface ContractCancellation {
  id: string;
  reason: string;
  refundAmount: number | string;
  cancelledDate: string;
  cancelledBy?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  storeId: string;
  quoteId?: string;
  contractNumber: string;
  customerName: string;
  totalAmount: number | string;
  status: ContractStatus;
  contractDate: string;
  deliveryDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  items?: ContractItem[];
  cancellation?: ContractCancellation;
}

export interface CreateContractItemDto {
  productName: string;
  collection: Collection;
  quantity: number;
  unitPrice: number;
}

export interface CreateContractDto {
  customerName: string;
  quoteId?: string;
  contractDate: string;
  deliveryDate?: string;
  items?: CreateContractItemDto[];
}

export interface CancelContractDto {
  reason: string;
  refundAmount?: number;
  cancelledDate: string;
}

export interface ContractListQuery {
  status?: ContractStatus;
  page?: number;
  limit?: number;
}
