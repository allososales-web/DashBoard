import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';

export enum ShiftTypeDto {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  FULL = 'FULL',
  OFF = 'OFF',
}

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsUUID()
  staffId: string;

  @IsNotEmpty()
  @IsDateString()
  workDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsEnum(ShiftTypeDto)
  shiftType?: ShiftTypeDto = ShiftTypeDto.FULL;

  @IsOptional()
  @IsString()
  notes?: string;
}
