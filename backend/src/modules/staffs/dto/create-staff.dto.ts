import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;
}
