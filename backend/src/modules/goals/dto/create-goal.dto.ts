import {
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export class CreateGoalDto {
  @IsInt()
  @Min(2020)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @IsInt()
  @Min(0)
  targetContracts: number;

  @IsInt()
  @Min(0)
  targetConsults: number;

  @IsOptional()
  @IsObject()
  customGoals?: Record<string, any>;
}
