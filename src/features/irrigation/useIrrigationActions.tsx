import { Stack, Text, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';

import { confirmDestructive } from '@/lib/confirm';
import { formatVolume, formatWhen } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useDeleteIrrigation, usePlanRecommended, useSkipIrrigation } from './api';
import type { IrrigationEvent } from './types';

/** Plan / skip / delete flows shared by the irrigation page, field page and overview. */
export function useIrrigationActions(farmId: string) {
  const plan = usePlanRecommended(farmId);
  const skip = useSkipIrrigation(farmId);
  const remove = useDeleteIrrigation(farmId);
  const [planningFieldId, setPlanningFieldId] = useState<string | null>(null);

  const planRecommended = (fieldId: string) => {
    setPlanningFieldId(fieldId);
    plan.mutate(fieldId, {
      onSuccess: (event) =>
        notifySuccess(
          `${event.fieldName}: ${formatVolume(event.volumeM3)} starting ${formatWhen(event.startedAt)}.`,
          'Irrigation planned',
        ),
      onError: (error) => notifyError(error, "Couldn't plan the irrigation"),
      onSettled: () => setPlanningFieldId(null),
    });
  };

  const skipEvent = (event: IrrigationEvent) => {
    let reason = '';
    modals.openConfirmModal({
      title: 'Skip this irrigation?',
      centered: true,
      children: (
        <Stack gap="sm">
          <Text size="sm">
            {event.fieldName}, {formatWhen(event.startedAt)}. The water balance will not count it
            and the field will be re-evaluated.
          </Text>
          <Textarea
            label="Reason"
            placeholder="e.g. rain overnight, power outage, pump fault"
            maxLength={500}
            autosize
            minRows={2}
            onChange={(changed) => {
              reason = changed.currentTarget.value;
            }}
          />
        </Stack>
      ),
      labels: { confirm: 'Skip irrigation', cancel: 'Keep it' },
      onConfirm: () =>
        skip.mutate(
          { eventId: event.id, reason: reason.trim() || null },
          {
            onSuccess: () => notifySuccess('Irrigation skipped'),
            onError: (error) => notifyError(error, "Couldn't skip the irrigation"),
          },
        ),
    });
  };

  const deleteEvent = (event: IrrigationEvent) =>
    confirmDestructive({
      title: 'Delete this irrigation record?',
      message: `${event.fieldName}, ${formatWhen(event.startedAt)}. Use this only for records entered by mistake; skip planned runs instead.`,
      onConfirm: () =>
        remove.mutate(event.id, {
          onSuccess: () => notifySuccess('Irrigation record deleted'),
          onError: (error) => notifyError(error, "Couldn't delete the record"),
        }),
    });

  return { planRecommended, planningFieldId, skipEvent, deleteEvent };
}
