import { IsString, IsUUID } from 'class-validator';

export class UploadResultDto {
  batchId: string;
  savedRows: number;
  skippedRows: number;
  totalRows: number;
  unmappedAliases: string[];
}

export class CreateStoreMappingDto {
  @IsString()
  aliasName: string;

  @IsUUID()
  storeId: string;
}
