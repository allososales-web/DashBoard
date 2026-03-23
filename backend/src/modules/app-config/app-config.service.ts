import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const URL_KEYS = ['deliveryUrl', 'loginInfoUrl', 'salesUrl'] as const;
type UrlKey = typeof URL_KEYS[number];

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

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
}
