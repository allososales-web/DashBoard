import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StoresModule } from './modules/stores/stores.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ConsultsModule } from './modules/consults/consults.module';
import { GoalsModule } from './modules/goals/goals.module';
import { MemosModule } from './modules/memos/memos.module';
import { IssuesModule } from './modules/issues/issues.module';
import { StaffsModule } from './modules/staffs/staffs.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { WorkRecordsModule } from './modules/work-records/work-records.module';
import { HqModule } from './modules/hq/hq.module';
import { InsightsModule } from './modules/insights/insights.module';
import { ExportModule } from './modules/export/export.module';
import { BannerModule } from './modules/banner/banner.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StoresModule,
    DashboardModule,
    QuotesModule,
    ContractsModule,
    ConsultsModule,
    GoalsModule,
    MemosModule,
    IssuesModule,
    StaffsModule,
    SchedulesModule,
    DeliveriesModule,
    WorkRecordsModule,
    HqModule,
    InsightsModule,
    ExportModule,
    BannerModule,
    AppConfigModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
