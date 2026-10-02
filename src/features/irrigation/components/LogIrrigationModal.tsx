import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';

import { useAssets } from '@/features/infrastructure/api';
import { formatDuration } from '@/lib/format';
import {
  applyServerErrors,
  instantToLocal,
  localToInstant,
  optionalNumber,
  optionalText,
} from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useLogIrrigation } from '../api';

type Amount = 'RUNTIME' | 'DEPTH' | 'VOLUME';

interface LogIrrigationModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  fields: { id: string; name: string }[];
  fieldId?: string;
  mode?: 'COMPLETED' | 'PLANNED';
}

export function LogIrrigationModal({
  opened,
  onClose,
  mode = 'COMPLETED',
  ...props
}: LogIrrigationModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'PLANNED' ? 'Plan an irrigation' : 'Log an irrigation'}
      centered
      size="lg"
    >
      <LogIrrigationForm
        key={`${props.fieldId ?? 'any'}-${mode}`}
        mode={mode}
        onClose={onClose}
        {...props}
      />
    </Modal>
  );
}

function LogIrrigationForm({
  farmId,
  fields,
  fieldId,
  mode = 'COMPLETED',
  onClose,
}: Omit<LogIrrigationModalProps, 'opened'>) {
  const log = useLogIrrigation(farmId);
  const assets = useAssets(farmId);
  const pumps = (assets.data ?? []).filter((asset) => asset.type === 'PUMP');

  const form = useForm({
    initialValues: {
      fieldId: fieldId ?? fields[0]?.id ?? null,
      status: mode,
      startedAt: instantToLocal(new Date()) as string | null,
      durationMinutes: 60 as number | '',
      amount: 'RUNTIME' as Amount,
      grossDepthMm: '' as number | '',
      volumeM3: '' as number | '',
      pumpAssetId: null as string | null,
      energyKwh: '' as number | '',
      notes: '',
    },
    validate: {
      fieldId: (value) => (value ? null : 'Select a field'),
      startedAt: (value, values) => {
        if (!value) return 'Enter the start time';
        if (values.status === 'COMPLETED' && new Date(value.replace(' ', 'T')) > new Date()) {
          return 'A completed irrigation cannot start in the future';
        }
        return null;
      },
      durationMinutes: (value) =>
        value === '' || value < 1 || value > 1440 ? 'Between 1 and 1440 minutes' : null,
      grossDepthMm: (value, values) =>
        values.amount === 'DEPTH' && (value === '' || value <= 0)
          ? 'Enter the depth applied'
          : null,
      volumeM3: (value, values) =>
        values.amount === 'VOLUME' && (value === '' || value <= 0) ? 'Enter the volume' : null,
    },
  });

  const { values } = form;
  const planned = values.status === 'PLANNED';

  const handleSubmit = form.onSubmit((submitted) => {
    if (!submitted.fieldId) {
      return;
    }
    log.mutate(
      {
        fieldId: submitted.fieldId,
        input: {
          status: submitted.status,
          source: 'MANUAL',
          startedAt: localToInstant(submitted.startedAt) ?? new Date().toISOString(),
          durationMinutes: Number(submitted.durationMinutes),
          grossDepthMm:
            submitted.amount === 'DEPTH' ? optionalNumber(submitted.grossDepthMm) : null,
          volumeM3: submitted.amount === 'VOLUME' ? optionalNumber(submitted.volumeM3) : null,
          pumpAssetId: submitted.pumpAssetId,
          energyKwh: planned ? null : optionalNumber(submitted.energyKwh),
          notes: optionalText(submitted.notes),
        },
      },
      {
        onSuccess: (event) => {
          notifySuccess(
            planned
              ? `Planned for ${event.fieldName}.`
              : `${event.fieldName}: the water balance now includes this irrigation.`,
            planned ? 'Irrigation planned' : 'Irrigation logged',
          );
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the irrigation"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <SegmentedControl
          fullWidth
          data={[
            { value: 'COMPLETED', label: 'Already irrigated' },
            { value: 'PLANNED', label: 'Plan for later' },
          ]}
          {...form.getInputProps('status')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Field"
            data={fields.map((field) => ({ value: field.id, label: field.name }))}
            required
            allowDeselect={false}
            disabled={Boolean(fieldId)}
            {...form.getInputProps('fieldId')}
          />
          <DateTimePicker
            label={planned ? 'Start' : 'Started'}
            valueFormat="DD MMM YYYY HH:mm"
            required
            maxDate={planned ? undefined : new Date()}
            minDate={planned ? new Date() : undefined}
            {...form.getInputProps('startedAt')}
          />
        </SimpleGrid>
        <NumberInput
          label="Run time"
          suffix=" min"
          min={1}
          max={1440}
          required
          description={
            values.durationMinutes !== ''
              ? formatDuration(Number(values.durationMinutes))
              : undefined
          }
          {...form.getInputProps('durationMinutes')}
        />
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Water applied
          </Text>
          <SegmentedControl
            data={[
              { value: 'RUNTIME', label: 'From run time' },
              { value: 'DEPTH', label: 'Depth (mm)' },
              { value: 'VOLUME', label: 'Metered volume' },
            ]}
            {...form.getInputProps('amount')}
          />
          {values.amount === 'RUNTIME' && (
            <Text size="xs" c="dimmed">
              Calculated from the run time and the field&apos;s application rate. Use a metered
              volume when you have a flow meter; it is more accurate.
            </Text>
          )}
          {values.amount === 'DEPTH' && (
            <NumberInput
              aria-label="Depth applied"
              suffix=" mm"
              min={0}
              max={500}
              decimalScale={1}
              {...form.getInputProps('grossDepthMm')}
            />
          )}
          {values.amount === 'VOLUME' && (
            <NumberInput
              aria-label="Volume applied"
              suffix=" m³"
              min={0}
              decimalScale={1}
              thousandSeparator=","
              {...form.getInputProps('volumeM3')}
            />
          )}
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: planned ? 1 : 2 }}>
          <Select
            label="Pump"
            placeholder="The field's usual pump"
            data={pumps.map((pump) => ({ value: pump.id, label: pump.name }))}
            clearable
            {...form.getInputProps('pumpAssetId')}
          />
          {!planned && (
            <NumberInput
              label="Energy used"
              description="Leave blank to estimate from the pump rating"
              suffix=" kWh"
              min={0}
              decimalScale={1}
              {...form.getInputProps('energyKwh')}
            />
          )}
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
          <Button type="submit" loading={log.isPending}>
            {planned ? 'Plan irrigation' : 'Log irrigation'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
