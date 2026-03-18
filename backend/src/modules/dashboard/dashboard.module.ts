import { Module } from '@nestjs/common';
import { KpiCalculatorService } from './kpi-calculator.service';
import { DashboardService } from './dashboard.service';
import { DashboardController, HqDashboardController } from './dashboard.controller';

@Module({
  controllers: [DashboardController, HqDashboardController],
  providers: [KpiCalculatorService, DashboardService],
  exports: [KpiCalculatorService],
})
export class DashboardModule {}
