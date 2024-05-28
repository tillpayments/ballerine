import * as common from '@nestjs/common';
import { BadRequestException, Body, Query } from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import type { InputJsonValue, TProjectId } from '@/types';
import { AppLoggerService } from '@/common/app-logger/app-logger.service';
import * as errors from '@/errors';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import { BusinessReportService } from '@/business-report/business-report.service';
import { GetLatestBusinessReportDto } from '@/business-report/get-latest-business-report.dto';
import {
  ListBusinessReportsDto,
  ListBusinessReportsSchema,
} from '@/business-report/list-business-reports.dto';
import { Business, BusinessReportStatus, Prisma } from '@prisma/client';
import { ZodValidationPipe } from '@/common/pipes/zod.pipe';
import axios from 'axios';
import { env } from '@/env';
import { CreateBusinessReportDto } from '@/business-report/dto/create-business-report.dto';
import {
  HookCallbackHandlerService,
  ReportWithRiskScoreSchema,
} from '@/workflow/hook-callback-handler.service';
import { CustomerService } from '@/customer/customer.service';
import { BusinessService } from '@/business/business.service';
import { AlertService } from '@/alert/alert.service';
import { Public } from '@/common/decorators/public.decorator';
import { VerifyUnifiedApiSignatureDecorator } from '@/common/decorators/verify-unified-api-signature.decorator';
import { BusinessReportHookBodyDto } from '@/business-report/dtos/business-report-hook-body.dto';
import { BusinessReportHookSearchQueryParamsDto } from '@/business-report/dtos/business-report-hook-search-query-params.dto';

@common.Controller('internal/business-reports')
@swagger.ApiExcludeController()
export class BusinessReportControllerInternal {
  constructor(
    protected readonly businessReportService: BusinessReportService,
    protected readonly logger: AppLoggerService,
    protected readonly customerService: CustomerService,
    protected readonly businessService: BusinessService,
    protected readonly alertService: AlertService,
    protected readonly hookCallbackService: HookCallbackHandlerService,
  ) {}

  @common.Post()
  @swagger.ApiOkResponse({ type: [String] })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  async createBusinessReport(
    @Body()
    {
      websiteUrl,
      countryCode,
      merchantName,
      callbackUrl,
      businessCorrelationId,
      reportType,
    }: CreateBusinessReportDto,
    @CurrentProject() currentProjectId: TProjectId,
  ) {
    if (!merchantName && !businessCorrelationId) {
      throw new BadRequestException('Merchant name or business id is required');
    }

    let business: Pick<Business, 'correlationId'> | undefined;

    if (!businessCorrelationId && merchantName) {
      business = await this.businessService.create({
        data: {
          companyName: merchantName,
          country: countryCode,
          website: websiteUrl,
          projectId: currentProjectId,
        },
        select: {
          correlationId: true,
          projectId: true,
        },
      });
    }

    await axios.post(
      `${env.UNIFIED_API_URL}/tld/reports`,
      {
        websiteUrl,
        countryCode,
        merchantName,
        reportType,
        callbackUrl: `${callbackUrl}?businessCorrelationId=${
          business?.correlationId ?? businessCorrelationId
        }`,
      },
      {
        headers: {
          Authorization: `Bearer ${env.UNIFIED_API_TOKEN}`,
        },
      },
    );

    return;
  }

  @common.Post('/hook')
  @swagger.ApiOkResponse({ type: [String] })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  @Public()
  @VerifyUnifiedApiSignatureDecorator()
  async createBusinessReportCallback(
    @Query() searchQueryParams: BusinessReportHookSearchQueryParamsDto,
    @Body() body: BusinessReportHookBodyDto,
  ) {
    const business = await this.businessService.getByCorrelationIdUnscoped(
      searchQueryParams.businessCorrelationId,
      {
        select: {
          id: true,
          correlationId: true,
          companyName: true,
          projectId: true,
        },
      },
    );
    const customer = await this.customerService.getByProjectId(business.projectId);
    const { reportData: unvalidatedReportData, base64Pdf, reportId, reportType } = body;
    const reportData = ReportWithRiskScoreSchema.parse(unvalidatedReportData);
    const { pdfReportBallerineFileId } =
      await this.hookCallbackService.persistPDFReportDocumentWithWorkflowDocuments({
        context: {
          entity: {
            ballerineEntityId: business.correlationId,
          },
          documents: [],
        },
        customer,
        projectId: business.projectId,
        base64PDFString: base64Pdf as string,
      });

    const reportRiskScore = reportData.summary.riskScore;

    const businessReport = await this.businessReportService.create({
      data: {
        type: reportType,
        riskScore: reportRiskScore,
        status: BusinessReportStatus.completed,
        report: {
          reportFileId: pdfReportBallerineFileId,
          data: reportData as InputJsonValue,
        },
        reportId,
        businessId: business.id,
        projectId: business.projectId,
      },
    });

    this.alertService
      .checkOngoingMonitoringAlert(businessReport, business.companyName)
      .then(() => {
        this.logger.debug(`Alert Tested for ${reportId}}`);
      })
      .catch(error => {
        this.logger.error(error);
      });

    return;
  }

  @common.Get('/latest')
  @swagger.ApiOkResponse({ type: [String] })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  async getLatestBusinessReport(
    @CurrentProject() currentProjectId: TProjectId,
    @Query() searchQueryParams: GetLatestBusinessReportDto,
  ) {
    return await this.businessReportService.findFirstOrThrow(
      {
        where: {
          businessId: searchQueryParams.businessId,
          type: searchQueryParams.type,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      [currentProjectId],
    );
  }

  @common.Get()
  @swagger.ApiOkResponse({ type: [String] })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  @common.UsePipes(new ZodValidationPipe(ListBusinessReportsSchema, 'query'))
  async listBusinessReports(
    @CurrentProject() currentProjectId: TProjectId,
    @Query() searchQueryParams: ListBusinessReportsDto,
  ) {
    return await this.businessReportService.findMany(
      {
        where: {
          businessId: searchQueryParams.businessId,
          ...(searchQueryParams.type ? { type: searchQueryParams.type } : {}),
        },
        select: {
          createdAt: true,
          updatedAt: true,
          report: true,
          riskScore: true,
          status: true,
          business: {
            select: {
              companyName: true,
              country: true,
              website: true,
            },
          },
        },
        orderBy: searchQueryParams.orderBy as
          | Prisma.Enumerable<Prisma.BusinessReportOrderByWithRelationInput>
          | undefined,
      },
      [currentProjectId],
    );
  }
}
