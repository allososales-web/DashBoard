export class MemoResponseDto {
  id: string;
  storeId: string;
  title: string;
  content: string | null;
  category: string;
  isPinned: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MemoListResponseDto {
  data: MemoResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
