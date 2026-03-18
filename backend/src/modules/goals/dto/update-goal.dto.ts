import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateGoalDto } from './create-goal.dto';

export class UpdateGoalDto extends PartialType(
  OmitType(CreateGoalDto, ['year', 'month'] as const),
) {}
