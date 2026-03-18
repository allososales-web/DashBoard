import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelType } from '@prisma/client';
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

  // 전체 매장 목록 (운영 현황용 - 페이지네이션 없이 전체)
  async findAllForAdmin() {
    return this.prisma.store.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
        isActive: true,
        showOnLogin: true,
        displayName: true,
        defaultChannel: true,
        storeAuth: {
          select: {
            plainPin: true,
            isFirstLogin: true,
            pinChangedAt: true,
          },
        },
        channelOverrides: {
          select: { id: true, year: true, month: true, channel: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // 매장 운영 설정 업데이트 (showOnLogin, displayName, defaultChannel)
  async updateStoreSettings(
    storeId: string,
    dto: { showOnLogin?: boolean; displayName?: string; defaultChannel?: ChannelType },
  ) {
    await this.findOne(storeId);
    return this.prisma.store.update({
      where: { id: storeId },
      data: dto,
    });
  }

  // 채널 오버라이드 설정
  async upsertChannelOverride(storeId: string, year: number, month: number, channel: ChannelType) {
    await this.findOne(storeId);
    return this.prisma.storeChannelOverride.upsert({
      where: { storeId_year_month: { storeId, year, month } },
      update: { channel },
      create: { storeId, year, month, channel },
    });
  }

  // 채널 오버라이드 삭제
  async deleteChannelOverride(storeId: string, year: number, month: number) {
    await this.findOne(storeId);
    await this.prisma.storeChannelOverride.deleteMany({
      where: { storeId, year, month },
    });
    return { message: '오버라이드가 삭제되었습니다' };
  }
}
