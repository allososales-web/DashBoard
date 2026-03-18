import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatusDto } from './update-delivery-status.dto';

export class DeliveryListQueryDto {
  @IsOptional()
  @IsEnum(DeliveryStatusDto)
  status?: DeliveryStatusDto;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
