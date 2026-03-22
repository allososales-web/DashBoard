import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

// Fallback images (current Alloso CDN URLs)
const FALLBACK_IMAGES = [
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20251210/_34691fc6-6124-4523-8821-93e43e1e6059.jpg',
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20251210/_8681a295-e64f-4d3b-8945-38a7c368a750.jpg',
  'https://cdn.alloso.co.kr/AllosoUpload/contents/20240725/_7a16dfb3-88f1-45e6-8d96-993354815469.jpg',
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

    try {
      const html = await this.fetchHtml('https://www.alloso.co.kr/');
      const images = this.parseVisualBannerImages(html);
      if (images.length > 0) {
        this.cachedImages = images;
        this.cacheTime = now;
        this.logger.log(`Fetched ${images.length} banner images from alloso.co.kr`);
        return images;
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch alloso.co.kr banner: ${err.message}`);
    }

    // Return fallback if scraping fails or returns nothing
    return FALLBACK_IMAGES;
  }

  private fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9',
          },
          timeout: 8000,
        },
        (res) => {
          // Follow redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            this.fetchHtml(res.headers.location).then(resolve).catch(reject);
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  private parseVisualBannerImages(html: string): string[] {
    const images: string[] = [];

    // Strategy 1: look for visual banner section img tags with CDN URLs
    // The banner section typically contains AllosoUpload images
    const bannerSectionMatch = html.match(/비주얼\s*배너[\s\S]{0,3000}/i);
    const searchArea = bannerSectionMatch ? bannerSectionMatch[0] : html;

    // Extract all CDN image URLs from the page
    const cdnPattern = /https:\/\/cdn\.alloso\.co\.kr\/AllosoUpload\/[^"'\s)>]+\.(?:jpg|jpeg|png|webp)/gi;
    const allCdnUrls = [...new Set(html.match(cdnPattern) || [])];

    // Filter: prefer banner/contents images, exclude small icons/thumbnails
    const bannerUrls = allCdnUrls.filter((url) => {
      const lower = url.toLowerCase();
      // Exclude obvious non-banner images
      if (lower.includes('icon') || lower.includes('logo') || lower.includes('btn')) return false;
      // Prefer contents/ path which is where banner images live
      return lower.includes('/contents/');
    });

    // Take up to 5 images
    images.push(...bannerUrls.slice(0, 5));

    return images;
  }
}
