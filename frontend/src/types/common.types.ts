export enum Collection {
  SATI = 'SATI',
  QUERENCIA = 'QUERENCIA',
  MILO = 'MILO',
  BONUM = 'BONUM',
  VARD = 'VARD',
  ELMER = 'ELMER',
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
