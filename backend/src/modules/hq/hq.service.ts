import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HqService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Notices ───
  async getNotices() {
    return this.prisma.hqNotice.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNotice(dto: {
    title: string;
    content: string;
    priority?: string;
    isPublished?: boolean;
    publishDate?: string;
    permanent?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.hqNotice.create({
      data: {
        title: dto.title,
        content: dto.content ?? '',
        priority: (dto.priority as any) ?? 'NORMAL',
        isPublished: dto.isPublished ?? true,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : null,
      },
    });
  }

  async updateNotice(id: string, dto: any) {
    const notice = await this.prisma.hqNotice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException('Notice not found');
    return this.prisma.hqNotice.update({ where: { id }, data: dto });
  }

  async deleteNotice(id: string) {
    await this.prisma.hqNotice.delete({ where: { id } });
    return { message: '공지가 삭제되었습니다' };
  }

  // ─── Events ───
  async getEvents() {
    return this.prisma.hqEvent.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async createEvent(dto: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
    targetStores?: any;
  }) {
    return this.prisma.hqEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate || dto.startDate),
        isActive: dto.isActive ?? true,
        targetStores: dto.targetStores ?? null,
      },
    });
  }

  async updateEvent(id: string, dto: any) {
    const event = await this.prisma.hqEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.hqEvent.update({ where: { id }, data });
  }

  async deleteEvent(id: string) {
    await this.prisma.hqEvent.delete({ where: { id } });
    return { message: '행사가 삭제되었습니다' };
  }

  // ─── Delivery Rules ───
  async getDeliveryRules() {
    return this.prisma.hqDeliveryRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertDeliveryRule(dto: { ruleName: string; description?: string; conditions?: any }) {
    return this.prisma.hqDeliveryRule.create({
      data: {
        ruleName: dto.ruleName,
        description: dto.description,
        conditions: dto.conditions ?? null,
        isActive: true,
      },
    });
  }

  async updateDeliveryRule(id: string, dto: any) {
    return this.prisma.hqDeliveryRule.update({ where: { id }, data: dto });
  }

  // ─── Delivery Calendar (납기 캘린더) ───
  // HqDeliveryRule의 conditions JSON에 { calendar: { "YYYY-MM": { day: status } } } 형태로 저장
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
      const cond = (existing.conditions as any) ?? {};
      cond[key] = dayStatuses;
      return this.prisma.hqDeliveryRule.update({ where: { id: existing.id }, data: { conditions: cond } });
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
      const cond = (existing.conditions as any) ?? {};
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
      const cond = (existing.conditions as any) ?? {};
      Object.assign(cond, goals);
      return this.prisma.hqDeliveryRule.update({ where: { id: existing.id }, data: { conditions: cond } });
    } else {
      return this.prisma.hqDeliveryRule.create({
        data: { ruleName: 'hq_goals', conditions: goals, isActive: true },
      });
    }
  }
}
