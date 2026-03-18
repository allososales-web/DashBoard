import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateStoreDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  showOnLogin?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEnum(ChannelType)
  defaultChannel?: ChannelType;
}
