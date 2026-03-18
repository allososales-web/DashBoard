import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CancelContractDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @IsNotEmpty()
  @IsDateString()
  cancelledDate: string;
}
