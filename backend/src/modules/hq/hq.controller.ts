import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { HqService } from './hq.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateDeliveryRuleDto } from './dto/create-delivery-rule.dto';
import { UpdateDeliveryRuleDto } from './dto/update-delivery-rule.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('hq')
export class HqController {
  constructor(private readonly hqService: HqService) {}

  // ─── Notices ───

  @Get('notices')
  findAllNotices() {
    return this.hqService.findAllNotices();
  }

  @Post('notices')
  @Roles(Role.HQ_ADMIN)
  createNotice(
    @Body() dto: CreateNoticeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const createdBy = /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null;
    return this.hqService.createNotice(dto, createdBy);
  }

  @Put('notices/:id')
  @Roles(Role.HQ_ADMIN)
  updateNotice(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.hqService.updateNotice(id, dto);
  }

  @Delete('notices/:id')
  @Roles(Role.HQ_ADMIN)
  removeNotice(@Param('id') id: string) {
    return this.hqService.removeNotice(id);
  }

  // ─── Events ───

  @Get('events')
  findAllEvents() {
    return this.hqService.findAllEvents();
  }

  @Post('events')
  @Roles(Role.HQ_ADMIN)
  createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const createdBy = /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null;
    return this.hqService.createEvent(dto, createdBy);
  }

  @Put('events/:id')
  @Roles(Role.HQ_ADMIN)
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.hqService.updateEvent(id, dto);
  }

  @Delete('events/:id')
  @Roles(Role.HQ_ADMIN)
  deleteEvent(@Param('id') id: string) {
    return this.hqService.deleteEvent(id);
  }

  // ─── Delivery Rules ───

  @Get('delivery-rules')
  findAllDeliveryRules() {
    return this.hqService.findAllDeliveryRules();
  }

  @Post('delivery-rules')
  @Roles(Role.HQ_ADMIN)
  createDeliveryRule(
    @Body() dto: CreateDeliveryRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const createdBy = /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null;
    return this.hqService.createDeliveryRule(dto, createdBy);
  }

  @Put('delivery-rules/:id')
  @Roles(Role.HQ_ADMIN)
  updateDeliveryRule(@Param('id') id: string, @Body() dto: UpdateDeliveryRuleDto) {
    return this.hqService.updateDeliveryRule(id, dto);
  }

  // ─── Delivery Calendar (납기 캘린더) ───

  @Get('delivery-calendar')
  getDeliveryCalendar(@Query('year') year: string, @Query('month') month: string) {
    return this.hqService.getDeliveryCalendar(Number(year), Number(month));
  }

  @Post('delivery-calendar')
  @Roles(Role.HQ_ADMIN)
  upsertDeliveryCalendar(
    @Body() dto: { year: number; month: number; dayStatuses: Record<number, string> },
  ) {
    return this.hqService.upsertDeliveryCalendar(dto.year, dto.month, dto.dayStatuses);
  }

  // ─── HQ Goal (사업부 목표) ───

  @Get('goal')
  getHqGoal(@Query('year') year: string, @Query('month') month: string) {
    return this.hqService.getHqGoal(Number(year), Number(month));
  }

  @Post('goal')
  @Roles(Role.HQ_ADMIN)
  upsertHqGoal(
    @Body() dto: { year: number; month: number; goal: { targetAmount: number; targetContracts: number; targetQuotes: number } },
  ) {
    return this.hqService.upsertHqGoal(dto.year, dto.month, dto.goal);
  }

  @Get('goals/annual')
  getAnnualGoals(@Query('year') year: string) {
    return this.hqService.getAnnualGoals(Number(year));
  }

  @Post('goals/annual')
  @Roles(Role.HQ_ADMIN)
  upsertAnnualGoals(
    @Body() dto: { year: number; goals: Record<string, { targetAmount: number; targetContracts: number; targetQuotes: number }> },
  ) {
    return this.hqService.upsertAnnualGoals(dto.year, dto.goals);
  }
}
