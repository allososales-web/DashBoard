import { IsString, IsBoolean, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkWorkRecordItemDto {
  @IsOptional()
  @IsString()
  staffName?: string;

  @IsDateString()
  workDate: string;

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;

  @IsOptional()
  @IsString()
  workTypeName?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class BulkWorkRecordsDto {
  @IsString()
  storeId: string;

  @IsNumber()
  year: number;

  @IsNumber()
  month: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkWorkRecordItemDto)
  records: BulkWorkRecordItemDto[];
}

export class UpsertWorkRecordDto {
  @IsString()
  staffId: string;

  @IsDateString()
  workDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  totalHours?: number;

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;

  @IsOptional()
  @IsString()
  offReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
