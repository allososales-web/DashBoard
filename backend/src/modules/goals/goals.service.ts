import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalListQueryDto } from './dto/goal-list-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateGoalDto, userId: string) {
    const existing = await this.prisma.monthlyGoal.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year: dto.year,
          month: dto.month,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Goal for ${dto.year}-${dto.month} already exists for this store`,
      );
    }

    return this.prisma.monthlyGoal.create({
      data: {
        storeId,
        year: dto.year,
        month: dto.month,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        targetContracts: dto.targetContracts,
        targetConsults: dto.targetConsults,
        customGoals: dto.customGoals ?? Prisma.JsonNull,
        createdBy: userId,
      },
    });
  }

  async findByMonth(storeId: string, year: number, month: number) {
    return this.prisma.monthlyGoal.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year,
          month,
        },
      },
    });
  }

  async findAll(storeId: string, query: GoalListQueryDto) {
    const { year, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (year) {
      where.year = year;
    }

    const [data, total] = await Promise.all([
      this.prisma.monthlyGoal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.monthlyGoal.count({ where }),
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

  async update(storeId: string, goalId: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.monthlyGoal.findFirst({
      where: { id: goalId, storeId },
    });

    if (!goal) {
      throw new NotFoundException(
        `Goal with id '${goalId}' not found`,
      );
    }

    const updateData: any = {};
    if (dto.targetAmount !== undefined)
      updateData.targetAmount = new Prisma.Decimal(dto.targetAmount);
    if (dto.targetContracts !== undefined)
      updateData.targetContracts = dto.targetContracts;
    if (dto.targetConsults !== undefined)
      updateData.targetConsults = dto.targetConsults;
    if (dto.customGoals !== undefined)
      updateData.customGoals = dto.customGoals ?? Prisma.JsonNull;

    return this.prisma.monthlyGoal.update({
      where: { id: goalId },
      data: updateData,
    });
  }
}
