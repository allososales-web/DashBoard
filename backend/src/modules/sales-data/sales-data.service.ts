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
  confirmedDate: Date;
  seriesCode: string | null;
  orderAmount: number;
  quantity: number;
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

    for (const record of records) {
      const amountRaw =
        record['수주단가*수량▲'] || record['수주단가*수량'] || '';
      const amount = this.parseNumber(amountRaw);

      if (amount === 0) {
        skippedCount++;
        continue;
      }

      const orderDate = this.parseDate(record['수주일자']);
      const confirmedDate = this.parseDate(record['확정납기']);

      if (!orderDate || !confirmedDate) {
        skippedCount++;
        continue;
      }

      const orderNumber = (record['수주번호'] || '').trim();
      const itemCode = (record['단품코드'] || '').trim();

      if (!orderNumber || !itemCode) {
        skippedCount++;
        continue;
      }

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

  async uploadCsv(buffer: Buffer, fileName: string, userId?: string) {
    const { rows, skippedCount } = this.parseCsv(buffer);
    const batchId = uuidv4();

    await this.prisma.salesUploadHistory.create({
      data: {
        id: batchId,
        fileName,
        uploadedBy: userId || null,
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
}
