import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CancelContractDto } from './dto/cancel-contract.dto';
import { ContractListQueryDto } from './dto/contract-list-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('stores/:storeId/contracts')
@UseGuards(StoreAccessGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles(Role.STORE_STAFF)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.create(storeId, dto, user.id);
  }

  @Get()
  @Roles(Role.STORE_STAFF)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: ContractListQueryDto,
  ) {
    return this.contractsService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.STORE_STAFF)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_MANAGER)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(storeId, id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.STORE_MANAGER)
  cancel(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: CancelContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.cancel(storeId, id, dto, user.id);
  }
}
