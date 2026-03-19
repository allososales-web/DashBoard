import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum NoticePriority {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT',
  URGENT = 'URGENT',
}

export class CreateNoticeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(NoticePriority)
  priority?: NoticePriority;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  publishDate?: string;
}
