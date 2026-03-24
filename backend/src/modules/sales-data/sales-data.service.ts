import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { CreateStoreMappingDto } from './dto/upload-result.dto';

interface ParsedRow {
  orderNumber: string;
  itemCode: string;
  storeAlias: string;
  orderDate: Date;
  confirmedDate: Date | null;
  seriesCode: string | null;
  orderAmount: number;
  quantity: number;
  itemName: string | null;
}

interface ParsedDeliveryRow {
  orderNumber: string;
  storeAlias: string;
  confirmedDate: Date;
  itemName: string | null;
}

@Injectable()
export class SalesDataService {
  constructor(private prisma: PrismaService) {}

  private parseNumber(val: string): number {
    if (!val) return 0;
    return parseFloat(val.replace(/,/g, '').trim()) || 0;
  }

  private parseDate(val: string): Date | null {
    if (!val || val.trim() === '') return null;
    const cleaned = val.trim().replace(/\//g, '-');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  parseCsv(buffer: Buffer): { rows: ParsedRow[]; skippedCount: number } {
    let text: string;
    try {
      text = iconv.decode(buffer, 'euc-kr');
      if (!text.includes('수주') && !text.includes('대리점')) {
        text = buffer.toString('utf-8');
      }
    } catch {
      text = buffer.toString('utf-8');
    }

    let records: Record<string, string>[];
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (e) {
      throw new BadRequestException(`CSV 파싱 오류: ${e.message}`);
    }

    const rows: ParsedRow[] = [];
    let skippedCount = 0;

    // 첫 번째 레코드의 컬럼명 로깅 (디버그용)
    if (records.length > 0) {
      console.log('[SalesData] CSV columns:', Object.keys(records[0]));
      console.log('[SalesData] First row sample:', JSON.stringify(records[0]));
    }

    for (const record of records) {
      const orderDate = this.parseDate(record['수주일자'] || record['주문일자'] || record['발주일자'] || '');

      if (!orderDate) {
        skippedCount++;
        continue;
      }

      const orderNumber = (record['수주번호'] || record['주문번호'] || record['발주번호'] || '').trim();
      const itemCode = (record['단품코드'] || record['품목코드'] || record['코드'] || '').trim();

      if (!orderNumber || !itemCode) {
        skippedCount++;
        continue;
      }

      const amountRaw = record['수주단가*수량'] || record['수주금액'] || record['금액'] || '';
      const amount = this.parseNumber(amountRaw);
      const confirmedDate = this.parseDate(record['확정납기'] || record['납기일'] || record['납기일자'] || '');

      rows.push({
        orderNumber,
        itemCode,
        storeAlias: (record['대리점'] || '').trim(),
        orderDate,
        confirmedDate,
        seriesCode: (record['시리즈구분'] || '').trim() || null,
        orderAmount: amount,
        quantity: parseInt(record['수주수량'] || '1', 10) || 1,
        itemName: (record['단품명칭(한글)'] || '').trim() || null,
      });
    }

    return { rows, skippedCount };
  }

  private isUuid(val?: string): boolean {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  async uploadCsv(buffer: Buffer, fileName: string, userId?: string) {
    const { rows, skippedCount } = this.parseCsv(buffer);
    const batchId = uuidv4();

    await this.prisma.salesUploadHistory.create({
      data: {
        id: batchId,
        fileName,
        uploadedBy: this.isUuid(userId) ? userId : null,
        totalRows: rows.length + skippedCount,
        savedRows: 0,
        skippedRows: skippedCount,
      },
    });

    const mappings = await this.prisma.storeAliasMapping.findMany({
      select: { aliasName: true },
    });
    const mappedAliases = new Set(mappings.map((m) => m.aliasName));

    let savedRows = 0;
    for (const row of rows) {
      await this.prisma.salesRawData.upsert({
        where: {
          orderNumber_itemCode: {
            orderNumber: row.orderNumber,
            itemCode: row.itemCode,
          },
        },
        update: {
          uploadBatchId: batchId,
          storeAlias: row.storeAlias,
          orderDate: row.orderDate,
          confirmedDate: row.confirmedDate,
          seriesCode: row.seriesCode,
          orderAmount: row.orderAmount,
          quantity: row.quantity,
          itemName: row.itemName,
        },
        create: {
          uploadBatchId: batchId,
          orderNumber: row.orderNumber,
          itemCode: row.itemCode,
          storeAlias: row.storeAlias,
          orderDate: row.orderDate,
          confirmedDate: row.confirmedDate,
          seriesCode: row.seriesCode,
          orderAmount: row.orderAmount,
          quantity: row.quantity,
          itemName: row.itemName,
        },
      });
      savedRows++;
    }

    await this.prisma.salesUploadHistory.update({
      where: { id: batchId },
      data: { savedRows },
    });

    const allAliases = [
      ...new Set(rows.map((r) => r.storeAlias).filter(Boolean)),
    ];
    const unmappedAliases = allAliases.filter((a) => !mappedAliases.has(a));

    return {
      batchId,
      savedRows,
      skippedRows: skippedCount,
      totalRows: rows.length + skippedCount,
      unmappedAliases,
    };
  }

  parseDeliveryCsv(buffer: Buffer): { rows: ParsedDeliveryRow[]; skippedCount: number } {
    let text: string;
    try {
      text = iconv.decode(buffer, 'euc-kr');
      if (!text.includes('수주') && !text.includes('대리점')) {
        text = buffer.toString('utf-8');
      }
    } catch {
      text = buffer.toString('utf-8');
    }

    let records: Record<string, string>[];
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (e) {
      throw new BadRequestException(`CSV 파싱 오류: ${e.message}`);
    }

    if (records.length > 0) {
      console.log('[Delivery] CSV columns:', Object.keys(records[0]));
    }

    const rows: ParsedDeliveryRow[] = [];
    let skippedCount = 0;

    for (const record of records) {
      const confirmedDate = this.parseDate(record['확정납기'] || record['납기일'] || record['납기일자'] || '');
      const orderNumber = (record['수주번호'] || record['주문번호'] || '').trim();

      if (!confirmedDate || !orderNumber) {
        skippedCount++;
        continue;
      }

      rows.push({
        orderNumber,
        storeAlias: (record['대리점'] || '').trim(),
        confirmedDate,
        itemName: (record['수주건명'] || record['단품명칭(한글)'] || '').trim() || null,
      });
    }

    return { rows, skippedCount };
  }

  async uploadDeliveryCsv(buffer: Buffer, fileName: string, userId?: string) {
    const { rows, skippedCount } = this.parseDeliveryCsv(buffer);
    const batchId = uuidv4();

    await this.prisma.salesUploadHistory.create({
      data: {
        id: batchId,
        fileName,
        uploadedBy: this.isUuid(userId) ? userId : null,
        totalRows: rows.length + skippedCount,
        savedRows: 0,
        skippedRows: skippedCount,
      },
    });

    const mappings = await this.prisma.storeAliasMapping.findMany({
      select: { aliasName: true },
    });
    const mappedAliases = new Set(mappings.map((m) => m.aliasName));

    let savedRows = 0;
    for (const row of rows) {
      // 납기일정은 itemCode가 없으므로 DELIVERY_ 접두사로 고유 키 생성
      const itemCode = `DELIVERY_${row.orderNumber}`;
      await this.prisma.salesRawData.upsert({
        where: {
          orderNumber_itemCode: {
            orderNumber: row.orderNumber,
            itemCode,
          },
        },
        update: {
          uploadBatchId: batchId,
          storeAlias: row.storeAlias,
          confirmedDate: row.confirmedDate,
          itemName: row.itemName,
        },
        create: {
          uploadBatchId: batchId,
          orderNumber: row.orderNumber,
          itemCode,
          storeAlias: row.storeAlias,
          orderDate: row.confirmedDate, // 납기일정엔 수주일자 없으므로 confirmedDate로 대체
          confirmedDate: row.confirmedDate,
          orderAmount: 0,
          quantity: 1,
          itemName: row.itemName,
        },
      });
      savedRows++;
    }

    await this.prisma.salesUploadHistory.update({
      where: { id: batchId },
      data: { savedRows },
    });

    const allAliases = [...new Set(rows.map((r) => r.storeAlias).filter(Boolean))];
    const unmappedAliases = allAliases.filter((a) => !mappedAliases.has(a));

    return {
      batchId,
      savedRows,
      skippedRows: skippedCount,
      totalRows: rows.length + skippedCount,
      unmappedAliases,
    };
  }

  async getUploadHistory() {
    return this.prisma.salesUploadHistory.findMany({
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async rollbackBatch(batchId: string) {
    const deleted = await this.prisma.salesRawData.deleteMany({
      where: { uploadBatchId: batchId },
    });
    await this.prisma.salesUploadHistory.delete({ where: { id: batchId } });
    return { deletedRows: deleted.count };
  }

  async createMapping(dto: CreateStoreMappingDto) {
    return this.prisma.storeAliasMapping.create({
      data: { aliasName: dto.aliasName, storeId: dto.storeId },
      include: { store: { select: { id: true, name: true } } },
    });
  }

  async findAllMappings() {
    return this.prisma.storeAliasMapping.findMany({
      include: { store: { select: { id: true, name: true } } },
      orderBy: { aliasName: 'asc' },
    });
  }

  async deleteMapping(id: string) {
    return this.prisma.storeAliasMapping.delete({ where: { id } });
  }

  async getUnmappedAliases(): Promise<string[]> {
    const [allAliases, mappings] = await Promise.all([
      this.prisma.salesRawData.findMany({
        select: { storeAlias: true },
        distinct: ['storeAlias'],
        where: { storeAlias: { not: '' } },
      }),
      this.prisma.storeAliasMapping.findMany({ select: { aliasName: true } }),
    ]);
    const mappedSet = new Set(mappings.map((m) => m.aliasName));
    return allAliases.map((r) => r.storeAlias).filter((a) => a && !mappedSet.has(a)).sort();
  }
}
