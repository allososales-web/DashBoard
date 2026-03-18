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
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteListQueryDto } from './dto/quote-list-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('stores/:storeId/quotes')
@UseGuards(StoreAccessGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles(Role.STORE_STAFF)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotesService.create(storeId, dto, user.id);
  }

  @Get()
  @Roles(Role.STORE_STAFF)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: QuoteListQueryDto,
  ) {
    return this.quotesService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.STORE_STAFF)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.quotesService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_STAFF)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.STORE_MANAGER)
  remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.quotesService.remove(storeId, id);
  }
}
