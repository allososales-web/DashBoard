import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { HqService } from './hq.service';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';

@Controller('hq')
export class HqController {
  constructor(private readonly hqService: HqService) {}

  // Notices
  @Get('notices')
  getNotices() {
    return this.hqService.getNotices();
  }

  @Post('notices')
  @Roles(Role.HQ_ADMIN)
  createNotice(@Body() dto: any) {
    return this.hqService.createNotice(dto);
  }

  @Put('notices/:id')
  @Roles(Role.HQ_ADMIN)
  updateNotice(@Param('id') id: string, @Body() dto: any) {
    return this.hqService.updateNotice(id, dto);
  }

  @Delete('notices/:id')
  @Roles(Role.HQ_ADMIN)
  deleteNotice(@Param('id') id: string) {
    return this.hqService.deleteNotice(id);
  }

  // Events
  @Get('events')
  getEvents() {
    return this.hqService.getEvents();
  }

  @Post('events')
  @Roles(Role.HQ_ADMIN)
  createEvent(@Body() dto: any) {
    return this.hqService.createEvent(dto);
  }

  @Put('events/:id')
  @Roles(Role.HQ_ADMIN)
  updateEvent(@Param('id') id: string, @Body() dto: any) {
    return this.hqService.updateEvent(id, dto);
  }

  @Delete('events/:id')
  @Roles(Role.HQ_ADMIN)
  deleteEvent(@Param('id') id: string) {
    return this.hqService.deleteEvent(id);
  }

  // Delivery Rules
  @Get('delivery-rules')
  getDeliveryRules() {
    return this.hqService.getDeliveryRules();
  }

  @Post('delivery-rules')
  @Roles(Role.HQ_ADMIN)
  createDeliveryRule(@Body() dto: any) {
    return this.hqService.upsertDeliveryRule(dto);
  }

  @Put('delivery-rules/:id')
  @Roles(Role.HQ_ADMIN)
  updateDeliveryRule(@Param('id') id: string, @Body() dto: any) {
    return this.hqService.updateDeliveryRule(id, dto);
  }

  // Delivery Calendar (납기 캘린더)
  @Get('delivery-calendar')
  getDeliveryCalendar(@Query('year') year: string, @Query('month') month: string) {
    return this.hqService.getDeliveryCalendar(Number(year), Number(month));
  }

  @Post('delivery-calendar')
  @Roles(Role.HQ_ADMIN)
  upsertDeliveryCalendar(@Body() dto: { year: number; month: number; dayStatuses: Record<number, string> }) {
    return this.hqService.upsertDeliveryCalendar(dto.year, dto.month, dto.dayStatuses);
  }

  // HQ Goal (사업부 목표)
  @Get('goal')
  getHqGoal(@Query('year') year: string, @Query('month') month: string) {
    return this.hqService.getHqGoal(Number(year), Number(month));
  }

  @Post('goal')
  @Roles(Role.HQ_ADMIN)
  upsertHqGoal(@Body() dto: { year: number; month: number; goal: { targetAmount: number; targetContracts: number; targetQuotes: number } }) {
    return this.hqService.upsertHqGoal(dto.year, dto.month, dto.goal);
  }

  // HQ Goals bulk (연간 일괄 저장)
  @Get('goals/annual')
  getAnnualGoals(@Query('year') year: string) {
    return this.hqService.getAnnualGoals(Number(year));
  }

  @Post('goals/annual')
  @Roles(Role.HQ_ADMIN)
  upsertAnnualGoals(@Body() dto: { year: number; goals: Record<string, { targetAmount: number; targetContracts: number; targetQuotes: number }> }) {
    return this.hqService.upsertAnnualGoals(dto.year, dto.goals);
  }
}
