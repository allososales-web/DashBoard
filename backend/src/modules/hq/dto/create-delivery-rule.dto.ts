import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryRuleDto {
  @IsString()
  ruleName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
