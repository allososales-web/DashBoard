export class ContractItemResponseDto {
  id: string;
  contractId: string;
  productName: string;
  collection: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export class ContractCancellationResponseDto {
  id: string;
  contractId: string;
  reason: string;
  refundAmount: number;
  cancelledBy: string;
  cancelledDate: Date;
  createdAt: Date;
}

export class ContractResponseDto {
  id: string;
  storeId: string;
  quoteId?: string;
  contractNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  contractDate: Date;
  deliveryDate?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  items: ContractItemResponseDto[];
  cancellation?: ContractCancellationResponseDto;
}
