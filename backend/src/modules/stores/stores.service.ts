import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreListQueryDto } from './dto/store-list-query.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreListResponseDto } from './dto/store-response.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StoreListQueryDto): Promise<StoreListResponseDto> {
    const { search, region, isActive, page = 1, limit = 20 } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (region) {
      where.region = region;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.store.count({ where }),
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

  async create(dto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Store with code '${dto.code}' already exists`);
    }

    return this.prisma.store.create({ data: dto });
  }

  async findOne(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store with id '${storeId}' not found`);
    }

    return store;
  }

  async update(storeId: string, dto: UpdateStoreDto) {
    await this.findOne(storeId);

    return this.prisma.store.update({
      where: { id: storeId },
      data: dto,
    });
  }

  async deactivate(storeId: string) {
    await this.findOne(storeId);

    return this.prisma.store.update({
      where: { id: storeId },
      data: { isActive: false },
    });
  }
}
