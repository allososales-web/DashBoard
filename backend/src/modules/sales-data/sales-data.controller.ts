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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/roles.enum';
import { SalesDataService } from './sales-data.service';
import { CreateStoreMappingDto } from './dto/upload-result.dto';

@Controller('sales-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HQ_ADMIN)
export class SalesDataController {
  constructor(private readonly salesDataService: SalesDataService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadCsv(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
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
}
