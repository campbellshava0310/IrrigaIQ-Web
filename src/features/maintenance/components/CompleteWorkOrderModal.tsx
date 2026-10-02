import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';

import { applyServerErrors, optionalNumber, optionalText } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useWorkOrderTransition } from '../api';
import type { WorkOrder } from '../types';

interface CompleteWorkOrderModalProps {
  workOrder: WorkOrder | null;
  onClose: () => void;
  farmId: string;
  currency: string;
}

/** Closing a job records what it cost and, for services, restarts the asset's service clock. */
export function CompleteWorkOrderModal({
  workOrder,
  onClose,
  farmId,
  currency,
}: CompleteWorkOrderModalProps) {
  return (
    <Modal
      opened={workOrder != null}
      onClose={onClose}
      title={workOrder ? `Complete ${workOrder.reference}` : ''}
      centered
    >
      {workOrder && (
        <CompleteForm
          key={workOrder.id}
          workOrder={workOrder}
          farmId={farmId}
          currency={currency}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function CompleteForm({
  workOrder,
  farmId,
  currency,
  onClose,
}: {
  workOrder: WorkOrder;
  farmId: string;
  currency: string;
  onClose: () => void;
}) {
  const transition = useWorkOrderTransition(farmId);
  const servicing = workOrder.kind === 'PREVENTIVE' || workOrder.kind === 'PREDICTIVE';
  const form = useForm({
    initialValues: {
      notes: '',
      cost: '' as number | '',
      downtimeHours: '' as number | '',
      resetServiceInterval: servicing,
      restoreOperational: workOrder.kind !== 'INSPECTION',
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    transition.mutate(
      {
        action: 'complete',
        id: workOrder.id,
        completion: {
          notes: optionalText(values.notes),
          cost: optionalNumber(values.cost),
          downtimeHours: optionalNumber(values.downtimeHours),
          resetServiceInterval: workOrder.asset ? values.resetServiceInterval : null,
          restoreOperational: workOrder.asset ? values.restoreOperational : false,
        },
      },
      {
        onSuccess: () => {
          notifySuccess(`${workOrder.reference} completed`);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't complete the work order"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <Text size="sm" c="dimmed">
          {workOrder.title}
          {workOrder.asset ? ` · ${workOrder.asset.name}` : ''}
        </Text>
        <Textarea
          label="What was done"
          autosize
          minRows={3}
          maxLength={2000}
          data-autofocus
          {...form.getInputProps('notes')}
        />
        <SimpleGrid cols={2}>
          <NumberInput
            label="Cost"
            prefix={`${currency} `}
            min={0}
            decimalScale={2}
            thousandSeparator=","
            {...form.getInputProps('cost')}
          />
          <NumberInput
            label="Irrigation downtime"
            suffix=" h"
            min={0}
            decimalScale={1}
            {...form.getInputProps('downtimeHours')}
          />
        </SimpleGrid>
        {workOrder.asset && (
          <Stack gap="xs">
            <Checkbox
              label="This was a service: restart the service clock"
              description="Sets last serviced to today and resets the run-hour counter"
              {...form.getInputProps('resetServiceInterval', { type: 'checkbox' })}
            />
            <Checkbox
              label={`Mark ${workOrder.asset.name} operational`}
              description="Clears a degraded, down or under-maintenance status"
              {...form.getInputProps('restoreOperational', { type: 'checkbox' })}
            />
          </Stack>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={transition.isPending}>
            Complete
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
