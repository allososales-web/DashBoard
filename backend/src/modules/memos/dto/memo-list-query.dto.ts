import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MemoCategoryDto } from './create-memo.dto';

export class MemoListQueryDto {
  @IsOptional()
  @IsEnum(MemoCategoryDto)
  category?: MemoCategoryDto;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
