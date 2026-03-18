import { Module } from '@nestjs/common';
import { KpiCalculatorService } from './kpi-calculator.service';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  controllers: [DashboardController],
  providers: [KpiCalculatorService, DashboardService],
  exports: [KpiCalculatorService],
})
export class DashboardModule {}
