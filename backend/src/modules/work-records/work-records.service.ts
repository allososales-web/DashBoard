import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertWorkRecordDto, BulkWorkRecordsDto } from './dto/work-record.dto';

@Injectable()
export class WorkRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyRecords(storeId: string, year: number, month: number) {
    // staffs + workRecords (raw to avoid Prisma client cache issues before migration)
    const staffs = await (this.prisma as any).staff.findMany({
      where: { storeId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const records = await (this.prisma as any).workRecord.findMany({
      where: { storeId, year, month },
      orderBy: { workDate: 'asc' },
    });

    return staffs.map((s: any) => ({
      ...s,
      workRecords: records.filter((r: any) => r.staffId === s.id),
    }));
  }

  async upsertRecord(storeId: string, dto: UpsertWorkRecordDto) {
    const date = new Date(dto.workDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    return (this.prisma as any).workRecord.upsert({
      where: {
        storeId_staffId_workDate: {
          storeId,
          staffId: dto.staffId,
          workDate: date,
        },
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalHours: dto.totalHours,
        isOff: dto.isOff ?? false,
        offReason: dto.offReason,
        notes: dto.notes,
      },
      create: {
        storeId,
        staffId: dto.staffId,
        workDate: date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalHours: dto.totalHours,
        isOff: dto.isOff ?? false,
        offReason: dto.offReason,
        year,
        month,
        notes: dto.notes,
      },
    });
  }

  // Bulk 저장: staffName 기반으로 staff upsert 후 workRecord 저장
  async bulkSave(dto: BulkWorkRecordsDto) {
    const { storeId, year, month, records } = dto;
    // 기존 해당 월 레코드 삭제 후 재삽입
    await (this.prisma as any).workRecord.deleteMany({ where: { storeId, year, month } });

    for (const rec of records) {
      if (!rec.staffName || rec.staffName.trim() === '') continue;
      // staff upsert by name
      let staff = await (this.prisma as any).staff.findFirst({ where: { storeId, name: rec.staffName.trim() } });
      if (!staff) {
        staff = await (this.prisma as any).staff.create({ data: { storeId, name: rec.staffName.trim(), isActive: true } });
      }
      // YYYY-MM-DD 형식을 로컬 날짜로 파싱 (UTC 오프셋 문제 방지)
      const [wy, wm, wd] = rec.workDate.split('-').map(Number);
      const workDate = new Date(wy, wm - 1, wd);
      // 중복 방지: 같은 staffId + workDate 조합 skip
      const existing = await (this.prisma as any).workRecord.findFirst({
        where: { storeId, staffId: staff.id, workDate },
      });
      if (existing) continue;
      await (this.prisma as any).workRecord.create({
        data: {
          storeId,
          staffId: staff.id,
          workDate,
          year,
          month,
          isOff: rec.isOff ?? false,
          startTime: rec.startTime ?? null,
          endTime: rec.endTime ?? null,
          totalHours: null,
          notes: rec.workTypeName ?? null,
        },
      });
    }
    return { success: true, count: records.length };
  }

  // HQ: 전 매장 근무 현황
  async getAllStoresMonthly(year: number, month: number) {
    const stores = await (this.prisma as any).store.findMany({
      where: { isActive: true, showOnLogin: true },
      orderBy: { code: 'asc' },
    });

    const allStaffs = await (this.prisma as any).staff.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const allRecords = await (this.prisma as any).workRecord.findMany({
      where: { year, month },
      orderBy: { workDate: 'asc' },
    });

    return stores.map((store: any) => {
      const staffs = allStaffs.filter((s: any) => s.storeId === store.id);
      return {
        ...store,
        staffs: staffs.map((s: any) => ({
          ...s,
          workRecords: allRecords.filter((r: any) => r.staffId === s.id),
        })),
      };
    });
  }
}
