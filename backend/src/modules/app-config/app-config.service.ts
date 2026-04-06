import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesDataService } from '../sales-data/sales-data.service';

const URL_KEYS = ['deliveryUrl', 'loginInfoUrl', 'salesUrl', 'salesScriptUrl', 'deliveryScriptUrl'] as const;
type UrlKey = typeof URL_KEYS[number];

/** 구글 시트 URL → 공개 CSV export URL 변환 */
function toGoogleSheetCsvUrl(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new BadRequestException('유효하지 않은 구글 시트 URL입니다');
  const id = match[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

/** Apps Script Web App URL 여부 판별 */
function isAppsScriptUrl(url: string): boolean {
  return url.includes('script.google.com/macros/s/');
}

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesDataService: SalesDataService,
  ) {}

  /** 서버 시작 시 자동 동기화 */
  async onModuleInit() {
    setTimeout(() => this.autoSync(), 5000); // 5초 후 첫 동기화
  }

  /** 매 시간 자동 동기화 (cron 없이 setInterval 사용) */
  private startAutoSync() {
    setInterval(() => this.autoSync(), 60 * 60 * 1000); // 1시간마다
  }

  private async autoSync() {
    try {
      const config = await this.prisma.appConfig.findUnique({ where: { key: 'salesUrl' } });
      if (!config?.value) return;
      const result = await this.syncSalesFromSheet();
      this.logger.log(`[AutoSync] 완료 — ${result.savedRows}건 저장, ${result.skippedRows}건 스킵`);
    } catch (e: any) {
      this.logger.warn(`[AutoSync] 실패: ${e.message}`);
    }
  }

  async getUrls() {
    const configs = await this.prisma.appConfig.findMany({
      where: { key: { in: [...URL_KEYS] } },
    });
    const map: Record<string, string | null> = {
      deliveryUrl: null,
      loginInfoUrl: null,
      salesUrl: null,
      salesScriptUrl: null,
      deliveryScriptUrl: null,
    };
    configs.forEach((c) => { map[c.key] = c.value ?? null; });
    return map;
  }

  async saveUrls(dto: Partial<Record<UrlKey, string | null>>) {
    for (const key of URL_KEYS) {
      if (key in dto) {
        await this.prisma.appConfig.upsert({
          where: { key },
          update: { value: dto[key] ?? null },
          create: { key, value: dto[key] ?? null },
        });
      }
    }
    return this.getUrls();
  }

  /** 구글 시트 매출 실적 동기화 — Apps Script URL 전용 */
  async syncSalesFromSheet(userId?: string) {
    const scriptConfig = await this.prisma.appConfig.findUnique({ where: { key: 'salesScriptUrl' } });
    if (!scriptConfig?.value) {
      throw new BadRequestException('매출 실적 Apps Script URL이 설정되지 않았습니다. 관리자 탭에서 Apps Script URL을 입력하세요.');
    }

    this.logger.log('[SalesSync] Apps Script URL로 fetch:', scriptConfig.value);
    let buffer: Buffer;
    try {
      const fetchOptions: RequestInit = { redirect: 'follow' };
      const res = await fetch(scriptConfig.value, fetchOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('application/json') || contentType.includes('javascript')) {
        const text = await res.text();
        // JSONP 응답 처리: callback({...}) 형식
        const jsonText = text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
        const json = JSON.parse(jsonText) as any;
        const rows: Record<string, any>[] = Array.isArray(json)
          ? json
          : (Array.isArray(json?.data) ? json.data : []);
        buffer = this.jsonToCsvBuffer(rows);
      } else {
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } catch (e: any) {
      throw new BadRequestException(`Apps Script fetch 실패: ${e.message}`);
    }

    const preview = buffer.slice(0, 200).toString('utf-8');
    this.logger.log('[SalesSync] 변환된 CSV preview:', preview);
    return this.salesDataService.uploadCsv(buffer, 'apps-script-sync.csv', userId);
  }

  /** JSON 배열 → CSV Buffer 변환 */
  private jsonToCsvBuffer(rows: Record<string, any>[]): Buffer {
    if (rows.length === 0) return Buffer.from('');
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '').replace(/"/g, '""');
          return val.includes(',') || val.includes('\n') ? `"${val}"` : val;
        }).join(',')
      ),
    ];
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  /** 매출 실적 Apps Script 컬럼 미리보기 (디버그용) */
  async previewSalesCsvColumns() {
    const scriptConfig = await this.prisma.appConfig.findUnique({ where: { key: 'salesScriptUrl' } });
    if (!scriptConfig?.value) throw new BadRequestException('매출 실적 Apps Script URL이 설정되지 않았습니다');

    let text: string;
    try {
      const res = await fetch(scriptConfig.value, { redirect: 'follow' });
      if (!res.ok) throw new BadRequestException(`HTTP ${res.status}`);
      const rawText = await res.text();
      // JSONP 또는 JSON 파싱
      const jsonText = rawText.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
      const json = JSON.parse(jsonText) as any;
      const rows: Record<string, any>[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      if (rows.length === 0) return { firstLine: '(데이터 없음)', secondLine: '', csvUrl: scriptConfig.value };
      const headers = Object.keys(rows[0]).join(', ');
      const firstRow = Object.values(rows[0]).join(', ');
      return { firstLine: headers, secondLine: firstRow, csvUrl: scriptConfig.value };
    } catch (e: any) {
      throw new BadRequestException(`Apps Script 미리보기 실패: ${e.message}`);
    }
  }

  /** 구글 시트 납기일정 URL 반환 (프론트에서 iframe/링크로 사용) */
  async getDeliverySheetUrl() {
    const config = await this.prisma.appConfig.findUnique({ where: { key: 'deliveryUrl' } });
    return { url: config?.value ?? null };
  }

  /** 구글 시트 납기일정 동기화 — 공유 구글시트 CSV URL 방식 */
  async syncDeliveryFromSheet(userId?: string) {
    const config = await this.prisma.appConfig.findUnique({ where: { key: 'deliveryUrl' } });
    if (!config?.value) throw new BadRequestException('납기일정 URL이 설정되지 않았습니다');

    const csvUrl = toGoogleSheetCsvUrl(config.value);
    let buffer: Buffer;
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (e: any) {
      throw new BadRequestException(`구글 시트 fetch 실패: ${e.message}. 시트가 공개(공유) 설정인지 확인하세요.`);
    }

    return this.salesDataService.uploadDeliveryCsv(buffer, 'delivery-sheet-sync.csv', userId);
  }

  /** 매장별 납기일정 조회 (confirmedDate 기준) */
  async getDeliverySchedule(storeId: string, year: number, month: number) {
    // storeId → aliasNames 조회
    const mappings = await this.prisma.storeAliasMapping.findMany({
      where: { storeId },
      select: { aliasName: true },
    });
    if (mappings.length === 0) return {};

    const aliasNames = mappings.map((m: { aliasName: string }) => m.aliasName);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const rows = await this.prisma.salesRawData.findMany({
      where: {
        storeAlias: { in: aliasNames },
        confirmedDate: { gte: startDate, lt: endDate },
      },
      select: { confirmedDate: true, itemName: true, orderNumber: true },
      orderBy: { confirmedDate: 'asc' },
    });

    // day → items 맵
    const result: Record<number, { itemName: string; orderNumber: string }[]> = {};
    for (const row of rows) {
      if (!row.confirmedDate) continue;
      const day = new Date(row.confirmedDate as Date).getDate();
      if (!result[day]) result[day] = [];
      result[day].push({
        itemName: row.itemName ?? '',
        orderNumber: row.orderNumber,
      });
    }
    return result;
  }
}
