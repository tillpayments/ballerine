import { AlertService } from '@/alert/alert.service';
import { ProjectAssigneeGuard } from '@/alert/guards/project-assignee.guard';
import { AppLoggerService } from '@/common/app-logger/app-logger.service';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import { ProjectIds } from '@/common/decorators/project-ids.decorator';
import { UseCustomerAuthGuard } from '@/common/decorators/use-customer-auth-guard.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod.pipe';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthenticatedEntity, TProjectId } from '@/types';
import * as common from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { Alert, AlertDefinition, Business, User } from '@prisma/client';
import * as errors from '../errors';
import { AlertAssigneeUniqueDto, BulkAlertsResponse } from './dtos/assign-alert.dto';
import { CreateAlertDefinitionDto } from './dtos/create-alert-definition.dto';
import { FindAlertsDto, FindAlertsSchema } from './dtos/get-alerts.dto';
import { BulkStatus, TBulkAssignAlertsResponse } from './types';
import { AlertDecisionDto } from './dtos/decision-alert.dto';
import { UserData } from '@/user/user-data.decorator';
import { AlertDefinitionService } from '@/alert-definition/alert-definition.service';

@swagger.ApiBearerAuth()
@swagger.ApiTags('Alerts')
@common.Controller('external/alerts')
export class AlertControllerExternal {
  constructor(
    protected readonly alertService: AlertService,
    protected readonly prisma: PrismaService,
    protected readonly logger: AppLoggerService,
    protected readonly alertDefinitionService: AlertDefinitionService,
  ) {}
  @common.Post()
  @swagger.ApiCreatedResponse({
    type: 'string',
  })
  @UseCustomerAuthGuard()
  @swagger.ApiForbiddenResponse()
  async create(
    @common.Body() createAlertDto: CreateAlertDefinitionDto,
    @CurrentProject() currentProjectId: TProjectId,
  ): Promise<AlertDefinition> {
    // Assuming create method in AlertService accepts CreateAlertDto and returns AlertDefinition
    return await this.alertService.create(createAlertDto, currentProjectId);
  }

  @common.Get('/')
  @swagger.ApiOkResponse({ type: Array<Object> }) // TODO: Set type
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  @common.UsePipes(new ZodValidationPipe(FindAlertsSchema, 'query'))
  async list(@common.Query() findAlertsDto: FindAlertsDto, @ProjectIds() projectIds: TProjectId[]) {
    const alerts = await this.alertService.getAlerts(findAlertsDto, projectIds, {
      include: {
        alertDefinition: {
          select: {
            description: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        business: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
    const formattedAlerts = alerts.map(alert => {
      const { alertDefinition, assignee, business, state, ...alertWithoutDefinition } =
        alert as Alert & {
          alertDefinition: Pick<AlertDefinition, 'description'>;
          assignee: Pick<User, 'id' | 'firstName' | 'lastName'>;
          business: Pick<Business, 'id' | 'companyName'>;
        };

      return {
        ...alertWithoutDefinition,
        assignee: assignee
          ? {
              id: assignee?.id,
              fullName: `${assignee?.firstName} ${assignee?.lastName}`,
            }
          : null,
        alertDetails: alertDefinition?.description,
        merchant: business ? { id: business.id, name: business.companyName } : null,
        decision: state,
      };
    });

    return formattedAlerts;
  }

  @common.Patch('assign')
  @common.UseGuards(ProjectAssigneeGuard)
  @swagger.ApiOkResponse({ type: BulkAlertsResponse })
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  async assignAlertById(
    @common.Body() { alertIds, assigneeId }: AlertAssigneeUniqueDto,
    @CurrentProject() currentProjectId: TProjectId,
  ): Promise<TBulkAssignAlertsResponse> {
    let updatedAlerts = [];

    updatedAlerts = await this.alertService.updateAlertsAssignee(
      alertIds,
      currentProjectId,
      assigneeId,
    );

    const updatedAlertsIds = new Set(updatedAlerts.map(alert => alert.id));

    const response: TBulkAssignAlertsResponse = {
      overallStatus:
        alertIds.length === updatedAlertsIds.size
          ? BulkStatus.SUCCESS
          : updatedAlertsIds.size === 0
          ? BulkStatus.FAILED
          : BulkStatus.PARTIAL,

      response: alertIds.map(alertId => {
        if (updatedAlertsIds.has(alertId)) {
          return {
            alertId,
            status: BulkStatus.SUCCESS,
          };
        }
        return {
          alertId,
          status: BulkStatus.FAILED,
          errors: [
            {
              message: 'Alert not found or not updated.',
            },
          ],
        };
      }),
    };

    return response;
  }

  @common.Patch('decision')
  @swagger.ApiOkResponse({ type: BulkAlertsResponse })
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  async decision(
    @common.Body() { alertIds, decision }: AlertDecisionDto,
    @CurrentProject() currentProjectId: TProjectId,
    @UserData() authenticatedAssignee: AuthenticatedEntity,
  ): Promise<TBulkAssignAlertsResponse> {
    // Assign alerts to the authenticated assignee
    if (authenticatedAssignee?.user?.id) {
      await this.alertService.updateAlertsAssignee(
        alertIds,
        currentProjectId,
        authenticatedAssignee.user.id,
      );
    }

    const updatedAlerts = await this.alertService.updateAlertsDecision(
      alertIds,
      currentProjectId,
      decision,
    );

    const response: TBulkAssignAlertsResponse = this.createBulkResponse(alertIds, updatedAlerts);

    return response;
  }

  private createBulkResponse(
    alertIds: string[],
    updatedAlerts: Alert[],
  ): TBulkAssignAlertsResponse {
    const updatedAlertsIds = new Set(updatedAlerts.map(alert => alert.id));

    return {
      overallStatus:
        alertIds.length === updatedAlertsIds.size
          ? BulkStatus.SUCCESS
          : updatedAlertsIds.size === 0
          ? BulkStatus.FAILED
          : BulkStatus.PARTIAL,

      response: alertIds.map(alertId => {
        if (updatedAlertsIds.has(alertId)) {
          return {
            alertId,
            status: BulkStatus.SUCCESS,
          };
        }
        return {
          alertId,
          status: BulkStatus.FAILED,
          errors: [
            {
              message: 'Alert not found or not updated.',
            },
          ],
        };
      }),
    };
  }

  @common.Get('/:id/alert-definition')
  @swagger.ApiOkResponse({ type: Object }) // TODO: Set type
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  async getAlertDefinitionByAlertId(
    @common.Param('id') id: string,
    @ProjectIds() projectIds: TProjectId[],
  ) {
    return this.alertDefinitionService.getByAlertId(id, projectIds);
  }
}