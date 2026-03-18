import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { DeliveryListQueryDto } from './dto/delivery-list-query.dto';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateDeliveryDto, userId: string) {
    if (dto.contractId) {
      const contract = await this.prisma.contract.findFirst({
        where: { id: dto.contractId, storeId },
      });
      if (!contract) {
        throw new BadRequestException(
          'Contract not found or does not belong to this store',
        );
      }
    }

    return this.prisma.delivery.create({
      data: {
        storeId,
        customerName: dto.customerName,
        scheduledDate: new Date(dto.scheduledDate),
        contractId: dto.contractId || null,
        address: dto.address || null,
        notes: dto.notes || null,
        createdBy: userId,
      },
    });
  }

  async findAll(storeId: string, query: DeliveryListQueryDto) {
    const { status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledDate: 'desc' },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(storeId: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, storeId },
    });

    if (!delivery) {
      throw new NotFoundException(
        `Delivery with id '${deliveryId}' not found`,
      );
    }

    return delivery;
  }

  async update(storeId: string, deliveryId: string, dto: UpdateDeliveryDto) {
    await this.findOne(storeId, deliveryId);

    if (dto.contractId) {
      const contract = await this.prisma.contract.findFirst({
        where: { id: dto.contractId, storeId },
      });
      if (!contract) {
        throw new BadRequestException(
          'Contract not found or does not belong to this store',
        );
      }
    }

    const updateData: any = {};
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.scheduledDate !== undefined) updateData.scheduledDate = new Date(dto.scheduledDate);
    if (dto.contractId !== undefined) updateData.contractId = dto.contractId || null;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
    });
  }

  async updateStatus(storeId: string, deliveryId: string, status: string) {
    const delivery = await this.findOne(storeId, deliveryId);

    const validTransitions: Record<string, string[]> = {
      SCHEDULED: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED', 'FAILED'],
    };

    const allowed = validTransitions[delivery.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${delivery.status} to ${status}`,
      );
    }

    const updateData: any = { status: status as DeliveryStatus };

    if (status === 'DELIVERED') {
      updateData.actualDate = new Date();
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
    });
  }
}
