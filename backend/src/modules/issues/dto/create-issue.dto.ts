import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum IssuePriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateIssueDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(IssuePriorityDto)
  priority?: IssuePriorityDto = IssuePriorityDto.MEDIUM;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
