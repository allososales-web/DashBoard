import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';

// Fallback images (updated periodically)
const FALLBACK_IMAGES = [
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20251210/_34691fc6-6124-4523-8821-93e43e1e6059.jpg',
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20251210/_8681a295-e64f-4d3b-8945-38a7c368a750.jpg',
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20240725/_7a16dfb3-88f1-45e6-8d96-993354815469.jpg',
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30분 — 홈페이지 업데이트 시 빠른 반영

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);
  private cachedImages: string[] = [];
  private cacheTime = 0;

  async getSliderImages(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedImages.length > 0 && now - this.cacheTime < CACHE_TTL_MS) {
      return this.cachedImages;
    }
    return this.refreshCache();
  }

  /** 캐시 강제 갱신 */
  async refreshCache(): Promise<string[]> {
    try {
      const html = await this.fetchHtml('https://www.alloso.co.kr/');
      const images = this.extractBannerImages(html);
      if (images.length > 0) {
        this.cachedImages = images;
        this.cacheTime = Date.now();
        this.logger.log(`[Banner] ${images.length}개 이미지 추출 성공`);
        return images;
      }
    } catch (err: any) {
      this.logger.warn(`[Banner] HTML fetch 실패: ${err.message}`);
    }

    // 전략 2: 폴백 이미지 반환
    this.logger.log('[Banner] 폴백 이미지 사용');
    return FALLBACK_IMAGES;
  }

  private fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = (client as typeof https).get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
          },
          timeout: 10000,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            this.fetchHtml(res.headers.location).then(resolve).catch(reject);
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  private extractBannerImages(html: string): string[] {
    const cdnPattern = /https:\/\/cdn\.alloso\.co\.kr\/AllosoUpload\/[^"'\s)>\]]+\.(?:jpg|jpeg|png|webp)/gi;
    const allUrls = [...new Set((html.match(cdnPattern) || []) as string[])];

    // 배너/콘텐츠 이미지만 필터 (아이콘, 로고, 버튼 제외)
    const bannerUrls = allUrls.filter((url) => {
      const lower = url.toLowerCase();
      return (
        lower.includes('/contents/') &&
        !lower.includes('icon') &&
        !lower.includes('logo') &&
        !lower.includes('btn') &&
        !lower.includes('thumb') &&
        !lower.includes('small')
      );
    });

    // script/data 속성에서 추가 이미지 URL 추출 (JS 번들 내 하드코딩된 URL)
    const scriptPattern = /["']https:\/\/cdn\.alloso\.co\.kr\/AllosoUpload\/contents\/[^"'\s]+\.(?:jpg|jpeg|png|webp)["']/gi;
    const scriptMatches = html.match(scriptPattern) || [];
    const scriptUrls = scriptMatches.map(m => m.replace(/["']/g, '').trim());

    const combined = [...new Set([...bannerUrls, ...scriptUrls])];

    // 날짜 기반 정렬 — 최신 이미지 우선 (URL에 날짜 포함: /YYYYMMDD/)
    combined.sort((a, b) => {
      const dateA = a.match(/\/(\d{8})\//)?.[1] ?? '0';
      const dateB = b.match(/\/(\d{8})\//)?.[1] ?? '0';
      return dateB.localeCompare(dateA);
    });

    return combined.slice(0, 5);
  }
}
