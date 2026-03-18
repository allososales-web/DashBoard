import { IsString, Length, IsOptional } from 'class-validator';

export class PinLoginDto {
  @IsString()
  storeId: string; // 'HQ' for headquarters, store UUID for stores

  @IsString()
  @Length(4, 4)
  pin: string;
}

export class ChangePinDto {
  @IsString()
  @Length(4, 4)
  currentPin: string;

  @IsString()
  @Length(4, 4)
  newPin: string;
}

export class ResetPinDto {
  @IsString()
  storeId: string; // 'HQ' or store UUID

  @IsString()
  @Length(4, 4)
  newPin: string;
}
