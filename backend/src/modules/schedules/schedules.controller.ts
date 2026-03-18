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
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleListQueryDto } from './dto/schedule-list-query.dto';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';

@Controller('stores/:storeId/schedules')
@UseGuards(StoreAccessGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(Role.STORE_MANAGER)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(storeId, dto);
  }

  @Get()
  @Roles(Role.STORE_STAFF)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: ScheduleListQueryDto,
  ) {
    return this.schedulesService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.STORE_STAFF)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.schedulesService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_MANAGER)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.STORE_MANAGER)
  remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.schedulesService.remove(storeId, id);
  }
}
