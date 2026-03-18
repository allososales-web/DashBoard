import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { IssuePriorityDto } from './create-issue.dto';
import { IssueStatusDto } from './update-issue-status.dto';

export class IssueListQueryDto {
  @IsOptional()
  @IsEnum(IssuePriorityDto)
  priority?: IssuePriorityDto;

  @IsOptional()
  @IsEnum(IssueStatusDto)
  status?: IssueStatusDto;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
