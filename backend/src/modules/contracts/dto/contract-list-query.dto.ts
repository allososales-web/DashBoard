import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ContractStatusFilter {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class ContractListQueryDto {
  @IsOptional()
  @IsEnum(ContractStatusFilter)
  status?: ContractStatusFilter;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
