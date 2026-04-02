import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/types/roles.enum';
import { SalesDataService } from './sales-data.service';
import { CreateStoreMappingDto } from './dto/upload-result.dto';
import { PushSalesBatchDto } from './dto/push-sales.dto';

@Controller('sales-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HQ_ADMIN)
export class SalesDataController {
  constructor(private readonly salesDataService: SalesDataService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadCsv(@UploadedFile() file: { buffer: Buffer; originalname: string }, @Request() req: any) {
    return this.salesDataService.uploadCsv(
      file.buffer,
      file.originalname,
      req.user?.id,
    );
  }

  @Get('upload-history')
  getUploadHistory() {
    return this.salesDataService.getUploadHistory();
  }

  @Delete('upload-history/:batchId')
  rollbackBatch(@Param('batchId') batchId: string) {
    return this.salesDataService.rollbackBatch(batchId);
  }

  @Get('store-mappings')
  findAllMappings() {
    return this.salesDataService.findAllMappings();
  }

  @Post('store-mappings')
  createMapping(@Body() dto: CreateStoreMappingDto) {
    return this.salesDataService.createMapping(dto);
  }

  @Delete('store-mappings/:id')
  deleteMapping(@Param('id') id: string) {
    return this.salesDataService.deleteMapping(id);
  }

  @Get('unmapped-aliases')
  getUnmappedAliases() {
    return this.salesDataService.getUnmappedAliases();
  }

  /**
   * 사내 호스트 서버 전용 push 엔드포인트
   * 인증: X-Api-Key 헤더 (환경변수 SALES_PUSH_API_KEY)
   * JWT 인증 불필요 — @Public() 처리
   */
  @Post('push')
  @Public()
  pushSalesBatch(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: PushSalesBatchDto,
  ) {
    const expected = process.env.SALES_PUSH_API_KEY;
    if (!expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
    return this.salesDataService.pushSalesBatch(dto);
  }
}

// 인증 없이 접근 가능한 디버그 컨트롤러 (임시)
@Controller('debug')
export class SalesDebugController {
  constructor(private readonly salesDataService: SalesDataService) {}

  @Get('sales-sample')
  @Public()
  async debugSample() {
    return this.salesDataService.getDebugSample();
  }

  @Get('sales-mappings')
  @Public()
  async debugMappings() {
    return this.salesDataService.findAllMappings();
  }
}
