import {
  Button,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';

import { formatDuration, formatVolume, formatWhen } from '@/lib/format';
import {
  applyServerErrors,
  instantToLocal,
  localToInstant,
  optionalNumber,
  optionalText,
} from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useCompleteIrrigation } from '../api';
import type { IrrigationEvent } from '../types';

interface CompleteIrrigationModalProps {
  event: IrrigationEvent | null;
  onClose: () => void;
  farmId: string;
}

/** Confirms a planned run with what actually happened; the water balance uses the actuals. */
export function CompleteIrrigationModal({ event, onClose, farmId }: CompleteIrrigationModalProps) {
  return (
    <Modal opened={event != null} onClose={onClose} title="Confirm irrigation" centered>
      {event && <CompleteForm key={event.id} event={event} farmId={farmId} onClose={onClose} />}
    </Modal>
  );
}

function CompleteForm({
  event,
  farmId,
  onClose,
}: {
  event: IrrigationEvent;
  farmId: string;
  onClose: () => void;
}) {
  const complete = useCompleteIrrigation(farmId);
  const plannedStart = new Date(event.startedAt);
  const form = useForm({
    initialValues: {
      startedAt: instantToLocal(plannedStart > new Date() ? new Date() : plannedStart) as
        string | null,
      durationMinutes: event.durationMinutes as number | '',
      volumeM3: '' as number | '',
      energyKwh: '' as number | '',
      notes: '',
    },
    validate: {
      durationMinutes: (value) =>
        value === '' || value < 1 || value > 1440 ? 'Between 1 and 1440 minutes' : null,
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    complete.mutate(
      {
        eventId: event.id,
        input: {
          startedAt: localToInstant(values.startedAt),
          durationMinutes: Number(values.durationMinutes),
          volumeM3: optionalNumber(values.volumeM3),
          energyKwh: optionalNumber(values.energyKwh),
          notes: optionalText(values.notes),
        },
      },
      {
        onSuccess: () => {
          notifySuccess(`${event.fieldName}: irrigation confirmed.`);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't confirm the irrigation"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <Text size="sm" c="dimmed">
          {event.fieldName}: planned {formatWhen(event.startedAt)},{' '}
          {formatDuration(event.durationMinutes)}, {formatVolume(event.volumeM3)}. Adjust anything
          that ran differently.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DateTimePicker
            label="Actual start"
            valueFormat="DD MMM YYYY HH:mm"
            maxDate={new Date()}
            {...form.getInputProps('startedAt')}
          />
          <NumberInput
            label="Actual run time"
            suffix=" min"
            min={1}
            max={1440}
            {...form.getInputProps('durationMinutes')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="Metered volume"
            description="Optional; overrides the planned depth"
            suffix=" m³"
            min={0}
            decimalScale={1}
            thousandSeparator=","
            {...form.getInputProps('volumeM3')}
          />
          <NumberInput
            label="Energy used"
            description="Optional; estimated otherwise"
            suffix=" kWh"
            min={0}
            decimalScale={1}
            {...form.getInputProps('energyKwh')}
          />
        </SimpleGrid>
        <Textarea
          label="Notes"
          autosize
          minRows={2}
          maxLength={500}
          {...form.getInputProps('notes')}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={complete.isPending}>
            Confirm irrigation
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
