import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { StoresService } from './stores.service';
import { StoreListQueryDto } from './dto/store-list-query.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Roles(Role.HQ_ADMIN)
  findAll(@Query() query: StoreListQueryDto) {
    return this.storesService.findAll(query);
  }

  @Post()
  @Roles(Role.HQ_ADMIN)
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Get(':storeId')
  @UseGuards(StoreAccessGuard)
  @Roles(Role.READONLY)
  findOne(@Param('storeId') storeId: string) {
    return this.storesService.findOne(storeId);
  }

  @Put(':storeId')
  @Roles(Role.HQ_ADMIN)
  update(@Param('storeId') storeId: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(storeId, dto);
  }

  @Delete(':storeId')
  @Roles(Role.HQ_ADMIN)
  deactivate(@Param('storeId') storeId: string) {
    return this.storesService.deactivate(storeId);
  }

  // 전체 매장 운영 현황 (관리자용)
  @Get('admin/all')
  @Roles(Role.HQ_ADMIN)
  findAllForAdmin() {
    return this.storesService.findAllForAdmin();
  }

  // 매장 운영 설정 업데이트
  @Patch(':storeId/settings')
  @Roles(Role.HQ_ADMIN)
  updateSettings(
    @Param('storeId') storeId: string,
    @Body() dto: { showOnLogin?: boolean; displayName?: string; defaultChannel?: ChannelType },
  ) {
    return this.storesService.updateStoreSettings(storeId, dto);
  }

  // 채널 오버라이드 설정
  @Post(':storeId/channel-override')
  @Roles(Role.HQ_ADMIN)
  upsertChannelOverride(
    @Param('storeId') storeId: string,
    @Body() dto: { year: number; month: number; channel: ChannelType },
  ) {
    return this.storesService.upsertChannelOverride(storeId, dto.year, dto.month, dto.channel);
  }

  // 채널 오버라이드 삭제
  @Delete(':storeId/channel-override')
  @Roles(Role.HQ_ADMIN)
  deleteChannelOverride(
    @Param('storeId') storeId: string,
    @Body() dto: { year: number; month: number },
  ) {
    return this.storesService.deleteChannelOverride(storeId, dto.year, dto.month);
  }
}
