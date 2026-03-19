import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CollectionAnalysisQueryDto {
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
  @IsUUID()
  storeId?: string;
}
