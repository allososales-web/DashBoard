export class ConsultResponseDto {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
  status: string;
  consultDate: Date;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  quotes?: any[];
}
