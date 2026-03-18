export class StaffResponseDto {
  id: string;
  storeId: string;
  name: string;
  phone: string | null;
  position: string | null;
  hireDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class StaffListResponseDto {
  data: StaffResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
