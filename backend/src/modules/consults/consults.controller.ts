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
import { ConsultsService } from './consults.service';
import { CreateConsultDto } from './dto/create-consult.dto';
import { UpdateConsultDto } from './dto/update-consult.dto';
import { ConsultListQueryDto } from './dto/consult-list-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('stores/:storeId/consults')
@UseGuards(StoreAccessGuard)
export class ConsultsController {
  constructor(private readonly consultsService: ConsultsService) {}

  @Post()
  @Roles(Role.STORE_STAFF)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateConsultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultsService.create(storeId, dto, user.id);
  }

  @Get()
  @Roles(Role.STORE_STAFF)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: ConsultListQueryDto,
  ) {
    return this.consultsService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.STORE_STAFF)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.consultsService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_STAFF)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConsultDto,
  ) {
    return this.consultsService.update(storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.STORE_MANAGER)
  remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.consultsService.remove(storeId, id);
  }
}
