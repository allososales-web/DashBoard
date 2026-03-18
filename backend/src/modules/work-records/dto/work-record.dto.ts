import { IsString, IsBoolean, IsOptional, IsDateString, IsNumber } from 'class-validator';

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
