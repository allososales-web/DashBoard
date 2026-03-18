import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalListQueryDto } from './dto/goal-list-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('stores/:storeId/goals')
@UseGuards(StoreAccessGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @Roles(Role.STORE_MANAGER)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateGoalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.goalsService.create(storeId, dto, user.id);
  }

  @Get()
  @Roles(Role.READONLY)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: GoalListQueryDto,
  ) {
    return this.goalsService.findAll(storeId, query);
  }

  @Get(':year/:month')
  @Roles(Role.READONLY)
  findByMonth(
    @Param('storeId') storeId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.goalsService.findByMonth(storeId, year, month);
  }

  @Put(':id')
  @Roles(Role.STORE_MANAGER)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(storeId, id, dto);
  }
}
