import { IsInt, IsOptional, IsEnum, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export type DataMode = 'ORDER' | 'SALES';

export class MetricsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsEnum(['ORDER', 'SALES'])
  dataMode?: DataMode;
}

export class KpiSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;
}
