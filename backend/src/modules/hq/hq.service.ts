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
}
