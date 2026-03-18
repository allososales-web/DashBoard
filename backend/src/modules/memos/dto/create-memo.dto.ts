import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum MemoCategoryDto {
  GENERAL = 'GENERAL',
  IMPORTANT = 'IMPORTANT',
  TODO = 'TODO',
}

export class CreateMemoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MemoCategoryDto)
  category?: MemoCategoryDto = MemoCategoryDto.GENERAL;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean = false;
}
