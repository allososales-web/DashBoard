import { IsEnum } from 'class-validator';

export enum DeliveryStatusDto {
  SCHEDULED = 'SCHEDULED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatusDto)
  status: DeliveryStatusDto;
}
