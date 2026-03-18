import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
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
}
