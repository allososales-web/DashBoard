import { Controller, Get, Post } from '@nestjs/common';
import { BannerService } from './banner.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/types/roles.enum';

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Public()
  @Get('images')
  async getImages() {
    const images = await this.bannerService.getSliderImages();
    return { images };
  }

  /** 캐시 강제 갱신 (HQ_ADMIN만) */
  @Post('refresh')
  @Roles(Role.HQ_ADMIN)
  async refresh() {
    const images = await this.bannerService.refreshCache();
    return { images, refreshedAt: new Date().toISOString() };
  }
}
