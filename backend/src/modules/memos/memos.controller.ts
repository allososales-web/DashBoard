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
import { MemosService } from './memos.service';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { MemoListQueryDto } from './dto/memo-list-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('stores/:storeId/memos')
@UseGuards(StoreAccessGuard)
export class MemosController {
  constructor(private readonly memosService: MemosService) {}

  @Post()
  @Roles(Role.STORE_STAFF)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateMemoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memosService.create(storeId, dto, user.id);
  }

  @Get()
  @Roles(Role.STORE_STAFF)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: MemoListQueryDto,
  ) {
    return this.memosService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.STORE_STAFF)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.memosService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_STAFF)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMemoDto,
  ) {
    return this.memosService.update(storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.STORE_MANAGER)
  remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.memosService.remove(storeId, id);
  }
}
