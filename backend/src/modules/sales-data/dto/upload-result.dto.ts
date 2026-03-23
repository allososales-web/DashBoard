export class UploadResultDto {
  batchId: string;
  savedRows: number;
  skippedRows: number;
  totalRows: number;
  unmappedAliases: string[];
}

export class CreateStoreMappingDto {
  aliasName: string;
  storeId: string;
}
