import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { MemoListQueryDto } from './dto/memo-list-query.dto';

@Injectable()
export class MemosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateMemoDto, userId: string) {
    return this.prisma.memo.create({
      data: {
        storeId,
        title: dto.title,
        content: dto.content || null,
        category: dto.category || 'GENERAL',
        isPinned: dto.isPinned ?? false,
        createdBy: userId,
      },
    });
  }

  async findAll(storeId: string, query: MemoListQueryDto) {
    const { category, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (category) {
      where.category = category;
    }

    const [data, total] = await Promise.all([
      this.prisma.memo.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.memo.count({ where }),
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

  async findOne(storeId: string, memoId: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id: memoId, storeId },
    });

    if (!memo) {
      throw new NotFoundException(
        `Memo with id '${memoId}' not found`,
      );
    }

    return memo;
  }

  async update(storeId: string, memoId: string, dto: UpdateMemoDto) {
    await this.findOne(storeId, memoId);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;

    return this.prisma.memo.update({
      where: { id: memoId },
      data: updateData,
    });
  }

  async remove(storeId: string, memoId: string) {
    await this.findOne(storeId, memoId);

    return this.prisma.memo.delete({
      where: { id: memoId },
    });
  }
}
