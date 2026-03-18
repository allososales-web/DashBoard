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
import { StaffsService } from './staffs.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffListQueryDto } from './dto/staff-list-query.dto';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';

@Controller('stores/:storeId/staffs')
@UseGuards(StoreAccessGuard)
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @Post()
  @Roles(Role.STORE_MANAGER)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffsService.create(storeId, dto);
  }

  @Get()
  @Roles(Role.STORE_STAFF)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: StaffListQueryDto,
  ) {
    return this.staffsService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.STORE_STAFF)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.staffsService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_MANAGER)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffsService.update(storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.STORE_MANAGER)
  deactivate(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.staffsService.deactivate(storeId, id);
  }
}
