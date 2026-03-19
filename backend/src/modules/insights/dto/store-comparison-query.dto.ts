import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StoreComparisonQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString({ each: true })
  storeIds?: string[];
}
