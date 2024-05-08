import { PrismaService } from '@/prisma/prisma.service';
import {
  AlertDefinition,
  AlertSeverity,
  Business,
  BusinessReportType,
  Counterparty,
  Customer,
  PaymentMethod,
  Prisma,
  Project,
  TransactionDirection,
  TransactionRecordType,
} from '@prisma/client';
import { tearDownDatabase } from '@/test/helpers/database-helper';
import { createCustomer } from '@/test/helpers/create-customer';
import { faker } from '@faker-js/faker';
import { createProject } from '@/test/helpers/create-project';
import { TransactionFactory } from '@/transaction/test-utils/transaction-factory';
import { AlertService } from '@/alert/alert.service';
import { commonTestingModules } from '@/test/helpers/nest-app-helper';
import { DataAnalyticsService } from '@/data-analytics/data-analytics.service';
import { ProjectScopeService } from '@/project/project-scope.service';
import { Test } from '@nestjs/testing';
import { AlertRepository } from '@/alert/alert.repository';
import { AlertDefinitionRepository } from '@/alert-definition/alert-definition.repository';
import {
  getAlertDefinitionCreateData,
  MERCHANT_MONITORING_ALERT_DEFINITIONS,
  TRANSACTIONS_ALERT_DEFINITIONS,
} from '../../scripts/alerts/generate-alerts';
import { generateBusiness } from '../../scripts/generate-end-user';
import console from 'console';
import { BusinessReportService } from '@/business-report/business-report.service';
import { BusinessReportRepository } from '@/business-report/business-report.repository';

describe('AlertService', () => {
  let prismaService: PrismaService;
  let alertService: AlertService;
  let customer: Customer;
  let project: Project;
  let transactionFactory: TransactionFactory;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: commonTestingModules,
      providers: [
        DataAnalyticsService,
        ProjectScopeService,
        AlertRepository,
        AlertDefinitionRepository,
        BusinessReportService,
        BusinessReportRepository,
        AlertService,
      ],
    }).compile();

    prismaService = module.get(PrismaService);

    alertService = module.get(AlertService);
  });

  beforeEach(async () => {
    await prismaService.$executeRaw`TRUNCATE TABLE "public"."Alert" CASCADE;`;
    await prismaService.$executeRaw`TRUNCATE TABLE "public"."AlertDefinition" CASCADE;`;
    await prismaService.$executeRaw`TRUNCATE TABLE "public"."TransactionRecord" CASCADE;`;

    customer = await createCustomer(
      prismaService,
      faker.datatype.uuid(),
      faker.datatype.uuid(),
      '',
      '',
      'webhook-shared-secret',
    );

    project = await createProject(prismaService, customer, faker.datatype.uuid());

    transactionFactory = new TransactionFactory({
      prisma: prismaService,
      projectId: project.id,
    });
  });

  afterAll(tearDownDatabase);

  describe('checkAllAlerts', () => {
    let baseTransactionFactory: TransactionFactory;

    beforeEach(() => {
      baseTransactionFactory = transactionFactory
        .paymentMethod(PaymentMethod.credit_card)
        .transactionDate(faker.date.recent(6));
    });

    describe('Rule: STRUC_CC', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC, project),
        });

        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountThreshold,
        ).toBeGreaterThanOrEqual(5);
        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountBetween.min,
        ).toBeGreaterThanOrEqual(500);
      });

      test('When there are more than 5 inbound transactions with amount of 501, an alert should be created', async () => {
        // Arrange
        const transactions = await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountBetween.min + 1)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.credit_card)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountThreshold + 1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(transactions[0]?.counterpartyBeneficiaryId);
      });

      test('When there inbound transactions with amount less of Threshold, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountBetween.min + 1)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.credit_card)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountThreshold - 1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });

      test('When there inbound transactions with amount less of 500, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountBetween.min - 1)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.credit_card)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountThreshold + 1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });

      test('When there are more than 5 inbound transactions with amount less than 500, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(499)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.credit_card)
          .count(6)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: STRUC_APM', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_APM, project),
        });

        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.STRUC_APM.inlineRule.options.amountThreshold,
        ).toBeGreaterThanOrEqual(5);
        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.STRUC_APM.inlineRule.options.amountBetween.min,
        ).toBeGreaterThanOrEqual(500);
      });

      test('When there are more than 5 inbound transactions with amount above between, an alert should be created', async () => {
        // Arrange
        const transactions = await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_APM.inlineRule.options.amountBetween.max - 1)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.bank_transfer)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_APM.inlineRule.options.amountThreshold + 1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(transactions[0]?.counterpartyBeneficiaryId);
      });

      test('When there are less than 5 inbound transactions with amount of 500, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(TRANSACTIONS_ALERT_DEFINITIONS.STRUC_CC.inlineRule.options.amountBetween.min - 1)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.pay_pal)
          .count(6)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });

      test('When there are more than 5 inbound transactions with amount of 499, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(499)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.pay_pal)
          .count(6)
          .create();

        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(501)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.pay_pal)
          .count(3)
          .create();

        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(501)
          .direction(TransactionDirection.inbound)
          .paymentMethod(PaymentMethod.credit_card)
          .count(6)
          .create();

        await baseTransactionFactory
          .withBusinessBeneficiary()
          .withEndUserOriginator()
          .amount(501)
          .direction(TransactionDirection.outbound)
          .paymentMethod(PaymentMethod.pay_pal)
          .count(6)
          .create();
        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: CHVC_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.CHVC_C, project),
        });
      });

      it('When there are more than or equal to 15 chargeback transactions, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(15)
          .type(TransactionRecordType.chargeback)
          .create();
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(14)
          .type(TransactionRecordType.chargeback)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When there are less than 15 chargeback transactions, no alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(14)
          .type(TransactionRecordType.chargeback)
          .create();
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(14)
          .type(TransactionRecordType.chargeback)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: SHCAC_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.SHCAC_C, project),
        });
      });

      it('When the sum of chargebacks amount is greater than 5000, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(100)
          .count(51)
          .type(TransactionRecordType.chargeback)
          .create();
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(100)
          .count(49)
          .type(TransactionRecordType.chargeback)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When the sum of chargebacks amount is less than 5000, no alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(100)
          .count(49)
          .type(TransactionRecordType.chargeback)
          .create();
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(100)
          .count(49)
          .type(TransactionRecordType.chargeback)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: CHCR_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.CHCR_C, project),
        });
      });

      it('When there are more than or equal to 15 refund transactions, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(15)
          .type(TransactionRecordType.refund)
          .create();
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(14)
          .type(TransactionRecordType.refund)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When there are less than 15 refund transactions, no alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(14)
          .type(TransactionRecordType.refund)
          .create();
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .count(14)
          .type(TransactionRecordType.refund)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: SHCAR_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.SHCAR_C, project),
        });
      });

      it('When the sum of refunds amount is greater than 5000, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(1000)
          .count(11)
          .type(TransactionRecordType.refund)
          .create();

        await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(10)
          .count(12)
          .type(TransactionRecordType.refund)
          .create();

        await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(5001)
          .count(13)
          .type(TransactionRecordType.chargeback)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);

        expect(alerts[0] as any).toMatchObject({
          executionDetails: { executionRow: { transactionCount: '11' } },
        });

        expect(alerts[0] as any).toMatchObject({
          executionDetails: { executionRow: { totalAmount: 1000 * 11 } },
        });

        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When the sum of refunds amount is less than 5000, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessOriginator()
          .withEndUserBeneficiary()
          .amount(100)
          .count(49)
          .type(TransactionRecordType.refund)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: HPC', () => {
      let alertDefinition: AlertDefinition;
      let counteryparty: Counterparty;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.HPC, project),
        });
        const correlationId = faker.datatype.uuid();
        counteryparty = await prismaService.counterparty.create({
          data: {
            project: { connect: { id: project.id } },
            correlationId: correlationId,
            business: {
              create: {
                correlationId: correlationId,
                companyName: faker.company.name(),
                registrationNumber: faker.datatype.uuid(),
                mccCode: faker.datatype.number({ min: 1000, max: 9999 }),
                businessType: faker.lorem.word(),
                project: { connect: { id: project.id } },
              },
            },
          },
        });
      });

      afterAll(async () => {
        return await prismaService.alertDefinition.delete({ where: { id: alertDefinition.id } });
      });

      it('When there are >=3 chargeback transactions and they are >=50% of the total transactions, an alert should be created', async () => {
        // Arrange
        const chargebackTransactions = await baseTransactionFactory
          .type(TransactionRecordType.chargeback)
          .withCounterpartyOriginator(counteryparty.id)
          .withEndUserBeneficiary()
          .count(3)
          .create();

        await baseTransactionFactory
          .type(TransactionRecordType.payment)
          .withCounterpartyOriginator(counteryparty.id)
          .withEndUserBeneficiary()
          .count(3)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          chargebackTransactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When there are >=3 chargeback transactions and they are <50% of the total transactions, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .type(TransactionRecordType.chargeback)
          .withEndUserBeneficiary()
          .withCounterpartyOriginator(counteryparty.id)
          .count(3)
          .create();

        await baseTransactionFactory
          .type(TransactionRecordType.payment)
          .withEndUserBeneficiary()
          .withCounterpartyOriginator(counteryparty.id)
          .count(4)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });

      it('When there are <3 chargeback transactions and they are >=50% of the total transactions, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .type(TransactionRecordType.chargeback)
          .withEndUserBeneficiary()
          .withCounterpartyOriginator(counteryparty.id)
          .count(2)
          .create();

        await baseTransactionFactory
          .type(TransactionRecordType.payment)
          .withEndUserBeneficiary()
          .withCounterpartyOriginator(counteryparty.id)
          .count(2)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: TLHAICC', () => {
      let alertDefinition: AlertDefinition;
      let counteryparty: Counterparty;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              ...TRANSACTIONS_ALERT_DEFINITIONS.TLHAICC,
            },
            project,
          ),
        });

        const correlationId = faker.datatype.uuid();
        counteryparty = await prismaService.counterparty.create({
          data: {
            project: { connect: { id: project.id } },
            correlationId: correlationId,
            business: {
              create: {
                correlationId: correlationId,
                companyName: faker.company.name(),
                registrationNumber: faker.datatype.uuid(),
                mccCode: faker.datatype.number({ min: 1000, max: 9999 }),
                businessType: faker.lorem.word(),
                project: { connect: { id: project.id } },
              },
            },
          },
        });
      });

      it('When there are >2 credit card transactions with >100 base amount and one transaction exceeds the average of all credit card transactions, an alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(150)
          .count(2)
          .create();

        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(300)
          .count(1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(counteryparty.id);
      });

      it('When there are 2 credit card transactions with >100 base amount and one transaction exceeds the average of all credit card transactions, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(150)
          .count(1)
          .create();

        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(300)
          .count(1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: TLHAIAPM', () => {
      let alertDefinition: AlertDefinition;
      let counteryparty: Counterparty;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              ...TRANSACTIONS_ALERT_DEFINITIONS.TLHAIAPM,
            },
            project,
          ),
        });

        const correlationId = faker.datatype.uuid();
        counteryparty = await prismaService.counterparty.create({
          data: {
            project: { connect: { id: project.id } },
            correlationId: correlationId,
            business: {
              create: {
                correlationId: correlationId,
                companyName: faker.company.name(),
                registrationNumber: faker.datatype.uuid(),
                mccCode: faker.datatype.number({ min: 1000, max: 9999 }),
                businessType: faker.lorem.word(),
                project: { connect: { id: project.id } },
              },
            },
          },
        });
      });

      it('When there are >2 APM transactions with >100 base amount and one transaction exceeds the average of all credit card transactions, an alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.apple_pay)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(150)
          .count(2)
          .create();

        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.pay_pal)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(300)
          .count(1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(counteryparty.id);
      });

      it('When there are 2 credit card transactions with >100 base amount and one transaction exceeds the average of all credit card transactions, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.google_pay)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(150)
          .count(1)
          .create();

        await baseTransactionFactory
          .direction('inbound')
          .paymentMethod(PaymentMethod.bank_transfer)
          .withCounterpartyBeneficiary(counteryparty.id)
          .amount(300)
          .count(1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: PAY_HCA_CC', () => {
      let alertDefinition: AlertDefinition;
      let counteryparty: Counterparty;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_CC, project),
        });

        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_CC.inlineRule.options.amountThreshold,
        ).toBeGreaterThanOrEqual(1000);
        expect(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_CC.inlineRule.options.direction).toBe(
          TransactionDirection.inbound,
        );
      });

      it('When there more than 1k credit card transactions, an alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .amount(2)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_CC.inlineRule.options.amountThreshold + 1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0] as any).toMatchObject({
          executionDetails: { executionRow: { transactionCount: '1001', totalAmount: 2002 } },
        });
      });

      it('When there are few transaction, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .amount(150)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_CC.inlineRule.options.amountThreshold % 10)
          .create();

        await baseTransactionFactory
          .direction('inbound')
          .withBusinessBeneficiary()
          .paymentMethod(PaymentMethod.apple_pay)
          .amount(150)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_CC.inlineRule.options.amountThreshold % 10)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: PAY_HCA_APM', () => {
      let alertDefinition: AlertDefinition;
      let counteryparty: Counterparty;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM, project),
        });

        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM.inlineRule.options.amountThreshold,
        ).toBeGreaterThanOrEqual(1000);
        expect(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM.inlineRule.options.direction).toBe(
          TransactionDirection.inbound,
        );

        expect(
          TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM.inlineRule.options.excludePaymentMethods,
        ).toBe(true);
      });

      it('When there more than 1k credit card transactions, an alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .direction('inbound')
          .paymentMethod(PaymentMethod.debit_card)
          .amount(2)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM.inlineRule.options.amountThreshold + 1)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0] as any).toMatchObject({
          executionDetails: { executionRow: { transactionCount: '1001', totalAmount: 2002 } },
        });
      });

      it('When there are few transaction, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .withBusinessBeneficiary()
          .direction('inbound')
          .paymentMethod(PaymentMethod.credit_card)
          .amount(150)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM.inlineRule.options.amountThreshold % 10)
          .create();

        await baseTransactionFactory
          .direction('inbound')
          .withBusinessBeneficiary()
          .paymentMethod(PaymentMethod.apple_pay)
          .amount(150)
          .count(TRANSACTIONS_ALERT_DEFINITIONS.PAY_HCA_APM.inlineRule.options.amountThreshold % 10)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });
  });

  describe('#checkOngoingMonitoringAlert', () => {
    let business: Business | null = null;
    let fileId: string | null;

    beforeEach(async () => {
      console.log(project);

      await prismaService.alertDefinition.create({
        data: getAlertDefinitionCreateData(
          MERCHANT_MONITORING_ALERT_DEFINITIONS.MERCHANT_ONGOING_RISK_ALERT_RISK_INCREASE,
          project,
        ),
      });

      business = await prismaService.business.create({
        data: generateBusiness({ projectId: project.id }),
      });

      fileId = (
        await prismaService.file.create({
          data: {
            fileName: 'ballerine.pdf',
            projectId: project.id,
            fileNameOnDisk: 'ballerine.pdf',
            userId: '',
            mimeType: 'dwa',
            uri: 'dwa.',
          },
        })
      ).id;
    });

    describe('When no previousReport ', () => {
      it("doesn't create alert", async () => {
        //Arrange
        const currentReport = await prismaService.businessReport.create({
          data: {
            businessId: business!.id,
            reportId: faker.datatype.uuid(),
            riskScore: 15,
            projectId: project.id,
            type: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
            report: {
              reportFileId: fileId,
              data: {
                summary: {
                  riskScore: 15,
                },
              },
            },
          } satisfies Prisma.BusinessReportUncheckedCreateInput,
        });

        // Act
        const response = await alertService.checkOngoingMonitoringAlert(
          {
            projectId: project.id,
            businessId: business!.id,
            reportId: currentReport.id,
            businessReportId: currentReport.id,
          },
          'cool company name',
        );

        //Assert
        expect(response).toBeUndefined();
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('When previous report not ongoing report ', () => {
      it("doesn't create alert", async () => {
        //Arrange
        const currentReport = await prismaService.businessReport.create({
          data: {
            businessId: business!.id,
            reportId: faker.datatype.uuid(),
            riskScore: 15,
            projectId: project.id,
            type: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
            report: {
              reportFileId: fileId,
              data: {
                summary: {
                  riskScore: 15,
                },
                previousReport: {
                  summary: {
                    riskScore: 50,
                  },
                  reportType: BusinessReportType.MERCHANT_REPORT_T1,
                },
              },
            },
          } satisfies Prisma.BusinessReportUncheckedCreateInput,
        });

        // Act
        const response = await alertService.checkOngoingMonitoringAlert(
          {
            projectId: project.id,
            businessId: business!.id,
            reportId: currentReport.id,
            businessReportId: currentReport.id,
          },
          'cool company name',
        );

        //Assert
        expect(response).toBeUndefined();
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('When previous report is ongoing report ', () => {
      describe('When previous report has higher risk score ', () => {
        it("doesn't create alert", async () => {
          //Arrange
          const currentReport = await prismaService.businessReport.create({
            data: {
              businessId: business!.id,
              reportId: faker.datatype.uuid(),
              riskScore: 15,
              projectId: project.id,
              type: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
              report: {
                reportFileId: fileId,
                data: {
                  summary: {
                    riskScore: 10,
                  },
                  previousReport: {
                    summary: {
                      riskScore: 55,
                    },
                    reportType: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
                  },
                },
              },
            } satisfies Prisma.BusinessReportUncheckedCreateInput,
          });

          // Act
          const response = await alertService.checkOngoingMonitoringAlert(
            {
              projectId: project.id,
              businessId: business!.id,
              reportId: currentReport.id,
              businessReportId: currentReport.id,
            },
            'cool company name',
          );

          //Assert
          expect(response).toBeUndefined();
          const alerts = await prismaService.alert.findMany();
          expect(alerts).toHaveLength(0);
        });
      });

      describe('When previous report does not hit required changes ', () => {
        it("doesn't create alert", async () => {
          //Arrange
          const currentReport = await prismaService.businessReport.create({
            data: {
              businessId: business!.id,
              reportId: faker.datatype.uuid(),
              riskScore: 15,
              projectId: project.id,
              type: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
              report: {
                reportFileId: fileId,
                data: {
                  summary: {
                    riskScore: 25,
                  },
                  previousReport: {
                    summary: {
                      riskScore: 15,
                    },
                    reportType: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
                  },
                },
              },
            } satisfies Prisma.BusinessReportUncheckedCreateInput,
          });

          // Act
          const response = await alertService.checkOngoingMonitoringAlert(
            {
              projectId: project.id,
              businessId: business!.id,
              reportId: currentReport.id,
              businessReportId: currentReport.id,
            },
            'cool company name',
          );

          //Assert
          expect(response).toBeUndefined();
          const alerts = await prismaService.alert.findMany();
          expect(alerts).toHaveLength(0);
        });
      });

      describe('When previous report hits necessary changes to invoke alert', () => {
        it('creates alert for specific', async () => {
          //Arrange
          const currentReport = await prismaService.businessReport.create({
            data: {
              businessId: business!.id,
              reportId: faker.datatype.uuid(),
              riskScore: 15,
              projectId: project.id,
              type: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
              report: {
                reportFileId: fileId,
                data: {
                  summary: {
                    riskScore: 35,
                  },
                  previousReport: {
                    summary: {
                      riskScore: 15,
                    },
                    reportType: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
                  },
                },
              },
            } satisfies Prisma.BusinessReportUncheckedCreateInput,
          });

          // Act
          const response = await alertService.checkOngoingMonitoringAlert(
            {
              projectId: project.id,
              businessId: business!.id,
              reportId: currentReport.id,
              businessReportId: currentReport.id,
            },
            'cool company name',
          );

          //Assert
          expect(response!.severity).toEqual(AlertSeverity.low);
          const alerts = await prismaService.alert.findMany();
          expect(alerts).toHaveLength(1);
        });

        describe('When previous report hits multiple alerts', () => {
          it('dispatches the highest severity alert', async () => {
            //Arrange
            const currentBusinessReport = await prismaService.businessReport.create({
              data: {
                businessId: business!.id,
                reportId: faker.datatype.uuid(),
                riskScore: 15,
                projectId: project.id,
                type: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
                report: {
                  reportFileId: fileId,
                  data: {
                    summary: {
                      riskScore: 40,
                    },
                    previousReport: {
                      summary: {
                        riskScore: 15,
                      },
                      reportType: BusinessReportType.ONGOING_MERCHANT_REPORT_T1,
                    },
                  },
                },
              } satisfies Prisma.BusinessReportUncheckedCreateInput,
            });

            await prismaService.alertDefinition.create({
              data: getAlertDefinitionCreateData(
                {
                  ...MERCHANT_MONITORING_ALERT_DEFINITIONS.MERCHANT_ONGOING_RISK_ALERT_THRESHOLD,
                  defaultSeverity: AlertSeverity.high,
                  inlineRule: {
                    id: 'MERCHANT_ONGOING_RISK_ALERT_THRESHOLD',
                    fnName: 'checkMerchantOngoingAlert',
                    subjects: ['businessId', 'projectId'],
                    options: {
                      maxRiskScoreThreshold: 40,
                    },
                  },
                },
                project,
              ),
            });
            await prismaService.alertDefinition.create({
              data: getAlertDefinitionCreateData(
                {
                  ...MERCHANT_MONITORING_ALERT_DEFINITIONS.MERCHANT_ONGOING_RISK_ALERT_THRESHOLD,
                  defaultSeverity: AlertSeverity.medium,
                  inlineRule: {
                    ...MERCHANT_MONITORING_ALERT_DEFINITIONS.MERCHANT_ONGOING_RISK_ALERT_THRESHOLD
                      .inlineRule,
                    id: 'MERCHANT_ONGOING_RISK_ALERT_THRESHOLD_MEDIUM',
                  },
                },
                project,
              ),
            });

            // Act
            const response = await alertService.checkOngoingMonitoringAlert(
              {
                projectId: project.id,
                businessId: business!.id,
                reportId: fileId!,
                businessReportId: currentBusinessReport.id,
              },
              'cool company name',
            );

            //Assert
            expect(response!.severity).toEqual(AlertSeverity.high);
            expect(response!.additionalInfo).toEqual({
              alertReason: 'The risk score has exceeded the threshold of 40',
              businessCompanyName: 'cool company name',
              businessId: business!.id,
              businessReportId: currentBusinessReport.id,
              previousRiskScore: 15,
              projectId: project.id,
              reportId: fileId,
              riskScore: 40,
              severity: 'high',
            });
            const alerts = await prismaService.alert.findMany();
            expect(alerts).toHaveLength(1);
          });
        });
      });
    });
  });
});
