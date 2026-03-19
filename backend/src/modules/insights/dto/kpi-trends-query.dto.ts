import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class KpiTrendsQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  startYear: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  endYear: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth: number;
}
