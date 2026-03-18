import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IssueStatus } from '@prisma/client';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { IssueListQueryDto } from './dto/issue-list-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('stores/:storeId/issues')
@UseGuards(StoreAccessGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @Roles(Role.STORE_STAFF)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.issuesService.create(storeId, dto, user.id);
  }

  @Get()
  @Roles(Role.READONLY)
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: IssueListQueryDto,
  ) {
    return this.issuesService.findAll(storeId, query);
  }

  @Get(':id')
  @Roles(Role.READONLY)
  findOne(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    return this.issuesService.findOne(storeId, id);
  }

  @Put(':id')
  @Roles(Role.STORE_STAFF)
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issuesService.update(storeId, id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.STORE_MANAGER)
  updateStatus(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIssueStatusDto,
  ) {
    return this.issuesService.updateStatus(
      storeId,
      id,
      dto.status as IssueStatus,
    );
  }
}
