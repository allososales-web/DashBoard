import { IsEnum } from 'class-validator';

export enum IssueStatusDto {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateIssueStatusDto {
  @IsEnum(IssueStatusDto)
  status: IssueStatusDto;
}
