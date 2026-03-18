export class IssueResponseDto {
  id: string;
  storeId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class IssueListResponseDto {
  data: IssueResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
