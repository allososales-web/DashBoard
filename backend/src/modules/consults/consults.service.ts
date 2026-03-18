import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultDto } from './dto/create-consult.dto';
import { UpdateConsultDto } from './dto/update-consult.dto';
import { ConsultListQueryDto } from './dto/consult-list-query.dto';

@Injectable()
export class ConsultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateConsultDto, userId: string) {
    return this.prisma.consult.create({
      data: {
        storeId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || null,
        customerEmail: dto.customerEmail || null,
        notes: dto.notes || null,
        consultDate: new Date(dto.consultDate),
        assignedTo: dto.assignedTo || null,
        status: dto.status || 'PENDING',
        createdBy: userId,
      },
    });
  }

  async findAll(storeId: string, query: ConsultListQueryDto) {
    const { status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.consultDate = {};
      if (startDate) {
        where.consultDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.consultDate.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.consult.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { consultDate: 'desc' },
        include: { quotes: true },
      }),
      this.prisma.consult.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(storeId: string, consultId: string) {
    const consult = await this.prisma.consult.findFirst({
      where: { id: consultId, storeId },
      include: { quotes: true },
    });

    if (!consult) {
      throw new NotFoundException(
        `Consult with id '${consultId}' not found`,
      );
    }

    return consult;
  }

  async update(storeId: string, consultId: string, dto: UpdateConsultDto) {
    await this.findOne(storeId, consultId);

    const updateData: any = {};
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.customerPhone !== undefined) updateData.customerPhone = dto.customerPhone;
    if (dto.customerEmail !== undefined) updateData.customerEmail = dto.customerEmail;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.consultDate !== undefined) updateData.consultDate = new Date(dto.consultDate);
    if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.prisma.consult.update({
      where: { id: consultId },
      data: updateData,
      include: { quotes: true },
    });
  }

  async remove(storeId: string, consultId: string) {
    await this.findOne(storeId, consultId);

    return this.prisma.consult.delete({
      where: { id: consultId },
    });
  }
}
