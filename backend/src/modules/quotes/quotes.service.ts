import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteListQueryDto } from './dto/quote-list-query.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateQuoteDto, userId: string) {
    // Validate consultId belongs to same store if provided
    if (dto.consultId) {
      const consult = await this.prisma.consult.findFirst({
        where: { id: dto.consultId },
      });
      if (!consult) {
        throw new BadRequestException('Consult not found');
      }
      if (consult.storeId !== storeId) {
        throw new BadRequestException('Consult does not belong to this store');
      }
    }

    // Get store code for quote number generation
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { code: true },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Generate quote number: QT-{storeCode}-{YYYYMM}-{seq}
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const existingCount = await this.prisma.quote.count({
      where: {
        storeId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const seq = String(existingCount + 1).padStart(4, '0');
    const quoteNumber = `QT-${store.code}-${yearMonth}-${seq}`;

    // Calculate totalAmount
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    // Create quote + items in transaction
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          storeId,
          consultId: dto.consultId || null,
          quoteNumber,
          customerName: dto.customerName,
          totalAmount: new Decimal(totalAmount),
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          createdBy: userId,
          items: {
            create: dto.items.map((item) => ({
              productName: item.productName,
              collection: item.collection,
              quantity: item.quantity,
              unitPrice: new Decimal(item.unitPrice),
              totalPrice: new Decimal(item.unitPrice * item.quantity),
            })),
          },
        },
        include: { items: true },
      });

      return quote;
    });
  }

  async findAll(storeId: string, query: QuoteListQueryDto) {
    const { status, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.quote.count({ where }),
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

  async findOne(storeId: string, quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, storeId },
      include: { items: true },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with id '${quoteId}' not found`);
    }

    return quote;
  }

  async update(storeId: string, quoteId: string, dto: UpdateQuoteDto) {
    const quote = await this.findOne(storeId, quoteId);

    if (quote.status !== 'DRAFT' && quote.status !== 'SENT') {
      throw new ConflictException(
        'Only quotes with DRAFT or SENT status can be updated',
      );
    }

    // Validate consultId if provided
    if (dto.consultId) {
      const consult = await this.prisma.consult.findFirst({
        where: { id: dto.consultId },
      });
      if (!consult) {
        throw new BadRequestException('Consult not found');
      }
      if (consult.storeId !== storeId) {
        throw new BadRequestException('Consult does not belong to this store');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let totalAmount: number | undefined;

      // If items are provided, delete existing and recreate
      if (dto.items && dto.items.length > 0) {
        await tx.quoteItem.deleteMany({ where: { quoteId } });

        totalAmount = dto.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );

        await tx.quoteItem.createMany({
          data: dto.items.map((item) => ({
            quoteId,
            productName: item.productName,
            collection: item.collection,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            totalPrice: new Decimal(item.unitPrice * item.quantity),
          })),
        });
      }

      const updateData: any = {};
      if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
      if (dto.consultId !== undefined) updateData.consultId = dto.consultId;
      if (dto.validUntil !== undefined) updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      if (totalAmount !== undefined) updateData.totalAmount = new Decimal(totalAmount);

      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: updateData,
        include: { items: true },
      });

      return updated;
    });
  }

  async remove(storeId: string, quoteId: string) {
    await this.findOne(storeId, quoteId);

    return this.prisma.quote.delete({
      where: { id: quoteId },
    });
  }
}
