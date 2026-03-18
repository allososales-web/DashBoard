import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
