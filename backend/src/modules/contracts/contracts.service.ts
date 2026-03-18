import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KpiCalculatorService } from '../dashboard/kpi-calculator.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CancelContractDto } from './dto/cancel-contract.dto';
import { ContractListQueryDto } from './dto/contract-list-query.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpiCalculator: KpiCalculatorService,
  ) {}

  async create(storeId: string, dto: CreateContractDto, userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { code: true },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Generate contract number: CT-{storeCode}-{YYYYMM}-{seq}
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const existingCount = await this.prisma.contract.count({
      where: {
        storeId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const seq = String(existingCount + 1).padStart(4, '0');
    const contractNumber = `CT-${store.code}-${yearMonth}-${seq}`;

    const contractDate = new Date(dto.contractDate);

    if (dto.quoteId) {
      // Quote-to-contract conversion
      const quote = await this.prisma.quote.findFirst({
        where: { id: dto.quoteId },
        include: { items: true },
      });

      if (!quote) {
        throw new NotFoundException('Quote not found');
      }

      if (quote.storeId !== storeId) {
        throw new BadRequestException('Quote does not belong to this store');
      }

      if (['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(quote.status)) {
        throw new ConflictException(
          `Quote is already ${quote.status} and cannot be converted to a contract`,
        );
      }

      const totalAmount = quote.items.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );

      const contract = await this.prisma.$transaction(async (tx) => {
        const created = await tx.contract.create({
          data: {
            storeId,
            quoteId: dto.quoteId,
            contractNumber,
            customerName: dto.customerName,
            totalAmount: new Decimal(totalAmount.toFixed(2)),
            contractDate,
            deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
            createdBy: userId,
            items: {
              create: quote.items.map((item) => ({
                productName: item.productName,
                collection: item.collection,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
          include: { items: true },
        });

        // Update quote status to ACCEPTED
        await tx.quote.update({
          where: { id: dto.quoteId },
          data: { status: 'ACCEPTED' },
        });

        return created;
      });

      // Trigger KPI recalculation
      await this.kpiCalculator.calculateMonthlyKpi(
        storeId,
        contractDate.getFullYear(),
        contractDate.getMonth() + 1,
      );

      return contract;
    }

    // Direct contract creation (no quote)
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'Items are required when creating a contract without a quote',
      );
    }

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const contract = await this.prisma.$transaction(async (tx) => {
      return tx.contract.create({
        data: {
          storeId,
          contractNumber,
          customerName: dto.customerName,
          totalAmount: new Decimal(totalAmount.toFixed(2)),
          contractDate,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          createdBy: userId,
          items: {
            create: dto.items!.map((item) => ({
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
    });

    // Trigger KPI recalculation
    await this.kpiCalculator.calculateMonthlyKpi(
      storeId,
      contractDate.getFullYear(),
      contractDate.getMonth() + 1,
    );

    return contract;
  }

  async findAll(storeId: string, query: ContractListQueryDto) {
    const { status, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { contractDate: 'desc' },
        include: { items: true },
      }),
      this.prisma.contract.count({ where }),
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

  async findOne(storeId: string, contractId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, storeId },
      include: { items: true, cancellation: true },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with id '${contractId}' not found`);
    }

    return contract;
  }

  async update(storeId: string, contractId: string, dto: UpdateContractDto) {
    await this.findOne(storeId, contractId);

    const updateData: any = {};
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.deliveryDate !== undefined) updateData.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: { items: true, cancellation: true },
    });
  }

  async cancel(
    storeId: string,
    contractId: string,
    dto: CancelContractDto,
    userId: string,
  ) {
    const contract = await this.findOne(storeId, contractId);

    if (contract.status === 'CANCELLED') {
      throw new ConflictException('Contract is already cancelled');
    }

    const totalAmount = Number(contract.totalAmount);
    const refundAmount = dto.refundAmount ?? totalAmount;

    if (refundAmount > totalAmount) {
      throw new BadRequestException(
        'Refund amount cannot exceed the contract total amount',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: contractId },
        data: { status: 'CANCELLED' },
      });

      const cancellation = await tx.contractCancellation.create({
        data: {
          contractId,
          reason: dto.reason,
          refundAmount: new Decimal(refundAmount.toFixed(2)),
          cancelledBy: userId,
          cancelledDate: new Date(dto.cancelledDate),
        },
      });

      return { ...updated, cancellation };
    });

    // Trigger KPI recalculation using the contract's contractDate
    const contractDate = contract.contractDate;
    await this.kpiCalculator.calculateMonthlyKpi(
      storeId,
      contractDate.getFullYear(),
      contractDate.getMonth() + 1,
    );

    return result;
  }
}
