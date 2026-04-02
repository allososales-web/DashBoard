import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 사내 호스트 서버에서 push하는 수주 데이터 단건 DTO
 * 필드명은 사내 서버 팀과 협의 후 조정 가능
 */
export class PushSalesRowDto {
  @IsString()
  @IsNotEmpty()
  orderNumber: string;       // 수주번호

  @IsString()
  @IsNotEmpty()
  itemCode: string;          // 단품코드

  @IsString()
  @IsNotEmpty()
  storeAlias: string;        // 대리점명 (storeAliasMapping과 매칭)

  @IsOptional()
  @IsDateString()
  orderDate?: string;        // 수주일자 (YYYY-MM-DD)

  @IsOptional()
  @IsDateString()
  confirmedDate?: string;    // 확정납기 (YYYY-MM-DD)

  @IsOptional()
  @IsString()
  seriesCode?: string;       // 시리즈구분 (SATI, QUERENCIA 등)

  @IsNumber()
  orderAmount: number;       // 수주금액 (원 단위)

  @IsOptional()
  @IsNumber()
  quantity?: number;         // 수주수량

  @IsOptional()
  @IsString()
  itemName?: string;         // 단품명칭
}

export class PushSalesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushSalesRowDto)
  rows: PushSalesRowDto[];

  @IsOptional()
  @IsString()
  source?: string;           // 데이터 출처 (예: 'inhouse-erp')
}
