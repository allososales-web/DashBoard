import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffListQueryDto } from './dto/staff-list-query.dto';

@Injectable()
export class StaffsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: {
        storeId,
        name: dto.name,
        phone: dto.phone || null,
        position: dto.position || null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
      },
    });
  }

  async findAll(storeId: string, query: StaffListQueryDto) {
    const { isActive, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.staff.count({ where }),
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

  async findOne(storeId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, storeId },
    });

    if (!staff) {
      throw new NotFoundException(
        `Staff with id '${staffId}' not found`,
      );
    }

    return staff;
  }

  async update(storeId: string, staffId: string, dto: UpdateStaffDto) {
    await this.findOne(storeId, staffId);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.hireDate !== undefined) updateData.hireDate = new Date(dto.hireDate);

    return this.prisma.staff.update({
      where: { id: staffId },
      data: updateData,
    });
  }

  async deactivate(storeId: string, staffId: string) {
    await this.findOne(storeId, staffId);

    return this.prisma.staff.update({
      where: { id: staffId },
      data: { isActive: false },
    });
  }
}
