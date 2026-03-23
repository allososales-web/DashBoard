import { Module } from '@nestjs/common';
import { KpiCalculatorService } from './kpi-calculator.service';
import { SalesKpiService } from './sales-kpi.service';
import { DashboardService } from './dashboard.service';
import { DashboardController, HqDashboardController } from './dashboard.controller';

@Module({
  controllers: [DashboardController, HqDashboardController],
  providers: [KpiCalculatorService, SalesKpiService, DashboardService],
  exports: [KpiCalculatorService, SalesKpiService],
})
export class DashboardModule {}
