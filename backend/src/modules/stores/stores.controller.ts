import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
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
}
