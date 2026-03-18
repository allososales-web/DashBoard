import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleListQueryDto } from './dto/schedule-list-query.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTime(time: string): Date {
    return new Date(`1970-01-01T${time}:00Z`);
  }

  async create(storeId: string, dto: CreateScheduleDto) {
    // Validate staffId belongs to same store
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, storeId },
    });
    if (!staff) {
      throw new BadRequestException(
        'Staff not found or does not belong to this store',
      );
    }

    return this.prisma.schedule.create({
      data: {
        storeId,
        staffId: dto.staffId,
        workDate: new Date(dto.workDate),
        startTime: dto.startTime ? this.parseTime(dto.startTime) : null,
        endTime: dto.endTime ? this.parseTime(dto.endTime) : null,
        shiftType: dto.shiftType || 'FULL',
        notes: dto.notes || null,
      },
      include: { staff: { select: { id: true, name: true, position: true } } },
    });
  }

  async findAll(storeId: string, query: ScheduleListQueryDto) {
    const { startDate, endDate, staffId, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate.gte = new Date(startDate);
      if (endDate) where.workDate.lte = new Date(endDate);
    }

    if (staffId) {
      where.staffId = staffId;
    }

    const [data, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { workDate: 'desc' },
        include: { staff: { select: { id: true, name: true, position: true } } },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(storeId: string, scheduleId: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, storeId },
      include: { staff: { select: { id: true, name: true, position: true } } },
    });

    if (!schedule) {
      throw new NotFoundException(
        `Schedule with id '${scheduleId}' not found`,
      );
    }

    return schedule;
  }

  async update(storeId: string, scheduleId: string, dto: UpdateScheduleDto) {
    await this.findOne(storeId, scheduleId);

    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, storeId },
      });
      if (!staff) {
        throw new BadRequestException(
          'Staff not found or does not belong to this store',
        );
      }
    }

    const updateData: any = {};
    if (dto.staffId !== undefined) updateData.staffId = dto.staffId;
    if (dto.workDate !== undefined) updateData.workDate = new Date(dto.workDate);
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime ? this.parseTime(dto.startTime) : null;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime ? this.parseTime(dto.endTime) : null;
    if (dto.shiftType !== undefined) updateData.shiftType = dto.shiftType;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: { staff: { select: { id: true, name: true, position: true } } },
    });
  }

  async remove(storeId: string, scheduleId: string) {
    await this.findOne(storeId, scheduleId);

    return this.prisma.schedule.delete({
      where: { id: scheduleId },
    });
  }
}
