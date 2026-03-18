import { Module } from '@nestjs/common';
import { HqController } from './hq.controller';
import { HqService } from './hq.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HqController],
  providers: [HqService],
})
export class HqModule {}
