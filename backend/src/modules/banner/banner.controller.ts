import { Controller, Get } from '@nestjs/common';
import { BannerService } from './banner.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Public()
  @Get('images')
  async getImages() {
    const images = await this.bannerService.getSliderImages();
    return { images };
  }
}
