export class DeliveryResponseDto {
  id: string;
  storeId: string;
  contractId: string | null;
  customerName: string;
  scheduledDate: Date;
  actualDate: Date | null;
  status: string;
  address: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DeliveryListResponseDto {
  data: DeliveryResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
