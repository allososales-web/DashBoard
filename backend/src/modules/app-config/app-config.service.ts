import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesDataService } from '../sales-data/sales-data.service';

const URL_KEYS = ['deliveryUrl', 'loginInfoUrl', 'salesUrl'] as const;
type UrlKey = typeof URL_KEYS[number];

/** 구글 시트 URL → 공개 CSV export URL 변환 */
function toGoogleSheetCsvUrl(url: string): string {
  // https://docs.google.com/spreadsheets/d/{id}/edit#gid={gid}
  // → https://docs.google.com/spreadsheets/d/{id}/export?format=csv&gid={gid}
  const match = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new BadRequestException('유효하지 않은 구글 시트 URL입니다');
  const id = match[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

@Injectable()
export class AppConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesDataService: SalesDataService,
  ) {}

  async getUrls() {
    const configs = await this.prisma.appConfig.findMany({
      where: { key: { in: [...URL_KEYS] } },
    });
    const map: Record<string, string | null> = {
      deliveryUrl: null,
      loginInfoUrl: null,
      salesUrl: null,
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

  /** 구글 시트 매출 실적 URL → CSV fetch → salesRawData 저장 */
  async syncSalesFromSheet(userId?: string) {
    const config = await this.prisma.appConfig.findUnique({ where: { key: 'salesUrl' } });
    if (!config?.value) throw new BadRequestException('매출 실적 URL이 설정되지 않았습니다');

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

    return this.salesDataService.uploadCsv(buffer, 'google-sheet-sync.csv', userId);
  }

  /** 구글 시트 납기일정 URL 반환 (프론트에서 iframe/링크로 사용) */
  async getDeliverySheetUrl() {
    const config = await this.prisma.appConfig.findUnique({ where: { key: 'deliveryUrl' } });
    return { url: config?.value ?? null };
  }
}
