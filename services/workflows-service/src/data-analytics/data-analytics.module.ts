import { Module } from '@nestjs/common';
import { ACLModule } from '@/common/access-control/acl.module';
import { DataAnalyticsControllerInternal } from '@/data-analytics/data-analytics.controller.internal';
import { DataAnalyticsService } from '@/data-analytics/data-analytics.service';
import { DataAnalyticsControllerExternal } from '@/data-analytics/data-analytics.controller.external';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProjectScopeService } from '@/project/project-scope.service';
import { BusinessReportModule } from '@/business-report/business-report.module';

@Module({
  imports: [ACLModule, PrismaModule, BusinessReportModule],
  controllers: [DataAnalyticsControllerInternal, DataAnalyticsControllerExternal],
  providers: [DataAnalyticsService, ProjectScopeService],
  exports: [ACLModule, DataAnalyticsService],
})
export class DataAnalyticsModule {}
