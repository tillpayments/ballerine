import { BaseSearchSchema } from '@/common/hooks/useSearchParamsByEntity/validation-schemas';
import { AlertStatus, AlertStatuses, TAlertsList } from '@/domains/alerts/fetchers';
import { BooleanishSchema } from '@/lib/zod/utils/checkers';
import { z } from 'zod';

export const getBusinessAlertsSearchSchema = () =>
  BaseSearchSchema.extend({
    sortBy: z
      .enum(['dataTimestamp', 'status'] as const satisfies ReadonlyArray<
        Extract<keyof TAlertsList[number], 'dataTimestamp' | 'status'>
      >)
      .catch('dataTimestamp'),
    filter: z
      .object({
        assigneeId: z.array(z.string().nullable()).catch([]),
        status: z.array(z.enum(AlertStatuses)).catch([AlertStatus.NEW]),
        state: z.array(z.string().nullable()).catch([]),
        label: z.array(z.string()).catch([]),
      })
      .catch({
        assigneeId: [],
        status: [AlertStatus.NEW],
        state: [],
        alertType: [],
        label: [],
      }),
    selected: BooleanishSchema.optional(),
    businessId: z.string().optional(),
    counterpartyId: z.string().optional(),
  });