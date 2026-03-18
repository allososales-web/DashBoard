export class StoreResponseDto {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  region: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class StoreListResponseDto {
  data: StoreResponseDto[];
  meta: PaginationMeta;
}
