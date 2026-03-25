import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateDeliveryRuleDto } from './dto/create-delivery-rule.dto';
import { UpdateDeliveryRuleDto } from './dto/update-delivery-rule.dto';

@Injectable()
export class HqService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Notices ───

  async findAllNotices() {
    return this.prisma.hqNotice.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNotice(dto: CreateNoticeDto, createdBy?: string) {
    return this.prisma.hqNotice.create({
      data: {
        title: dto.title,
        content: dto.content ?? '',
        priority: (dto.priority as any) ?? 'NORMAL',
        isPublished: dto.isPublished ?? false,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : null,
        createdBy: createdBy ?? null,
      },
    });
  }

  async updateNotice(id: string, dto: UpdateNoticeDto) {
    const notice = await this.prisma.hqNotice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException('Notice not found');

    const data: any = { ...dto };
    if (dto.publishDate) data.publishDate = new Date(dto.publishDate);

    return this.prisma.hqNotice.update({ where: { id }, data });
  }

  async removeNotice(id: string) {
    const notice = await this.prisma.hqNotice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException('Notice not found');
    await this.prisma.hqNotice.delete({ where: { id } });
    return { message: '공지가 삭제되었습니다' };
  }

  // ─── Events ───

  async findAllEvents() {
    return this.prisma.hqEvent.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async createEvent(dto: CreateEventDto, createdBy?: string) {
    return this.prisma.hqEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate ?? dto.startDate),
        isActive: dto.isActive ?? true,
        targetStores: dto.targetStores ?? undefined,
        createdBy: createdBy ?? null,
      },
    });
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    const event = await this.prisma.hqEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.hqEvent.update({ where: { id }, data });
  }

  // ─── Delivery Rules ───

  async findAllDeliveryRules() {
    return this.prisma.hqDeliveryRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDeliveryRule(dto: CreateDeliveryRuleDto, createdBy?: string) {
    return this.prisma.hqDeliveryRule.create({
      data: {
        ruleName: dto.ruleName,
        description: dto.description,
        conditions: dto.conditions ?? undefined,
        isActive: dto.isActive ?? true,
        createdBy: createdBy ?? null,
      },
    });
  }

  async updateDeliveryRule(id: string, dto: UpdateDeliveryRuleDto) {
    const rule = await this.prisma.hqDeliveryRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Delivery rule not found');
    return this.prisma.hqDeliveryRule.update({ where: { id }, data: dto as any });
  }

  // ─── Legacy aliases (기존 컨트롤러 호환) ───

  /** @deprecated use findAllNotices */
  async getNotices() {
    return this.findAllNotices();
  }

  /** @deprecated use findAllEvents */
  async getEvents() {
    return this.findAllEvents();
  }

  /** @deprecated use findAllDeliveryRules */
  async getDeliveryRules() {
    return this.findAllDeliveryRules();
  }

  /** @deprecated use createDeliveryRule */
  async upsertDeliveryRule(dto: { ruleName: string; description?: string; conditions?: any }) {
    return this.createDeliveryRule(dto as CreateDeliveryRuleDto);
  }

  /** @deprecated use removeNotice */
  async deleteNotice(id: string) {
    return this.removeNotice(id);
  }

  async deleteEvent(id: string) {
    const event = await this.prisma.hqEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.prisma.hqEvent.delete({ where: { id } });
    return { message: '행사가 삭제되었습니다' };
  }

  // ─── Delivery Calendar (납기 캘린더) ───

  async getDeliveryCalendar(year: number, month: number): Promise<Record<number, string>> {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const rule = await this.prisma.hqDeliveryRule.findFirst({
      where: { ruleName: 'delivery_calendar', isActive: true },
    });
    if (!rule || !rule.conditions) return {};
    const cond = rule.conditions as any;
    return cond[key] ?? {};
  }

  async upsertDeliveryCalendar(year: number, month: number, dayStatuses: Record<number, string>) {
    const key = `${year}-${String(month).padStart(2, '0')}`;

    const existing = await this.prisma.hqDeliveryRule.findFirst({
      where: { ruleName: 'delivery_calendar', isActive: true },
    });

    if (existing) {
      // findUnique로 최신 데이터를 다시 읽어서 해당 월만 업데이트 (다른 월 보존)
      const fresh = await this.prisma.hqDeliveryRule.findUnique({ where: { id: existing.id } });
      const cond: Record<string, any> = { ...((fresh?.conditions as Record<string, any>) ?? {}) };
      cond[key] = dayStatuses;
      return this.prisma.hqDeliveryRule.update({
        where: { id: existing.id },
        data: { conditions: cond },
      });
    } else {
      return this.prisma.hqDeliveryRule.create({
        data: { ruleName: 'delivery_calendar', conditions: { [key]: dayStatuses }, isActive: true },
      });
    }
  }

  // ─── HQ Goal (사업부 목표) ───

  async getHqGoal(year: number, month: number) {
    const rule = await this.prisma.hqDeliveryRule.findFirst({
      where: { ruleName: 'hq_goals', isActive: true },
    });
    if (!rule || !rule.conditions) return null;
    const cond = rule.conditions as any;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return cond[key] ?? null;
  }

  async upsertHqGoal(year: number, month: number, goal: { targetAmount: number; targetContracts: number; targetQuotes: number }) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const existing = await this.prisma.hqDeliveryRule.findFirst({
      where: { ruleName: 'hq_goals', isActive: true },
    });
    if (existing) {
      const fresh = await this.prisma.hqDeliveryRule.findUnique({ where: { id: existing.id } });
      const cond: Record<string, any> = { ...((fresh?.conditions as Record<string, any>) ?? {}) };
      cond[key] = goal;
      return this.prisma.hqDeliveryRule.update({ where: { id: existing.id }, data: { conditions: cond } });
    } else {
      return this.prisma.hqDeliveryRule.create({
        data: { ruleName: 'hq_goals', conditions: { [key]: goal }, isActive: true },
      });
    }
  }

  async getAnnualGoals(year: number): Promise<Record<string, any>> {
    const rule = await this.prisma.hqDeliveryRule.findFirst({
      where: { ruleName: 'hq_goals', isActive: true },
    });
    if (!rule || !rule.conditions) return {};
    const cond = rule.conditions as any;
    const result: Record<string, any> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, '0')}`;
      if (cond[key]) result[key] = cond[key];
    }
    return result;
  }

  async upsertAnnualGoals(year: number, goals: Record<string, { targetAmount: number; targetContracts: number; targetQuotes: number }>) {
    const existing = await this.prisma.hqDeliveryRule.findFirst({
      where: { ruleName: 'hq_goals', isActive: true },
    });
    if (existing) {
      // 최신 데이터를 다시 읽어서 spread 후 merge (stale reference 방지)
      const fresh = await this.prisma.hqDeliveryRule.findUnique({ where: { id: existing.id } });
      const cond: Record<string, any> = { ...((fresh?.conditions as Record<string, any>) ?? {}) };
      Object.assign(cond, goals);
      return this.prisma.hqDeliveryRule.update({ where: { id: existing.id }, data: { conditions: cond } });
    } else {
      return this.prisma.hqDeliveryRule.create({
        data: { ruleName: 'hq_goals', conditions: goals, isActive: true },
      });
    }
  }
}
