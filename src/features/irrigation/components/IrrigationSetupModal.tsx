import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';

import { ErrorState, LoadingState } from '@/components/QueryStates';
import { useField } from '@/features/farms/api';
import {
  IRRIGATION_METHOD_DEFAULTS,
  IRRIGATION_METHODS,
  type Field,
  type IrrigationMethod,
} from '@/features/farms/types';
import { useAssets } from '@/features/infrastructure/api';
import { applyServerErrors, optionalNumber } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useConfigureIrrigation } from '../api';

interface IrrigationSetupModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  fieldId: string;
  fieldName: string;
}

/** How water gets to the field: drives run time, gross depth, pump window and energy. */
export function IrrigationSetupModal({
  opened,
  onClose,
  farmId,
  fieldId,
  fieldName,
}: IrrigationSetupModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Irrigation system · ${fieldName}`}
      centered
      size="lg"
    >
      <SetupLoader farmId={farmId} fieldId={fieldId} onClose={onClose} />
    </Modal>
  );
}

function SetupLoader({
  farmId,
  fieldId,
  onClose,
}: {
  farmId: string;
  fieldId: string;
  onClose: () => void;
}) {
  const field = useField(farmId, fieldId);
  if (field.isPending) return <LoadingState />;
  if (field.isError) return <ErrorState error={field.error} onRetry={() => field.refetch()} />;
  return (
    <SetupForm key={field.data.updatedAt} farmId={farmId} field={field.data} onClose={onClose} />
  );
}

function SetupForm({
  farmId,
  field,
  onClose,
}: {
  farmId: string;
  field: Field;
  onClose: () => void;
}) {
  const configure = useConfigureIrrigation(farmId, field.id);
  const assets = useAssets(farmId);
  const pumps = (assets.data ?? []).filter((asset) => asset.type === 'PUMP');
  const form = useForm({
    initialValues: {
      method: field.irrigationMethod as IrrigationMethod | null,
      applicationRateMmH: (field.applicationRateMmH ?? '') as number | '',
      efficiencyPct: (field.systemEfficiency != null
        ? Math.round(field.systemEfficiency * 100)
        : '') as number | '',
      pumpAssetId: field.pumpAssetId,
      mulched: field.mulched ?? false,
    },
    validate: {
      method: (value) => (value ? null : 'Select how this field is irrigated'),
      efficiencyPct: (value) =>
        value !== '' && (value < 30 || value > 100) ? 'Between 30% and 100%' : null,
    },
  });
  const defaults = form.values.method ? IRRIGATION_METHOD_DEFAULTS[form.values.method] : null;

  const handleSubmit = form.onSubmit((values) => {
    const efficiency = optionalNumber(values.efficiencyPct);
    configure.mutate(
      {
        method: values.method,
        applicationRateMmH: optionalNumber(values.applicationRateMmH),
        efficiency: efficiency != null ? efficiency / 100 : null,
        pumpAssetId: values.pumpAssetId,
        mulched: values.mulched,
      },
      {
        onSuccess: () => {
          notifySuccess(
            'Recommendations now use this irrigation system.',
            'Irrigation system saved',
          );
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the irrigation system"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <Select
          label="Irrigation method"
          data={IRRIGATION_METHODS.map((method) => ({
            value: method,
            label: IRRIGATION_METHOD_DEFAULTS[method].label,
          }))}
          required
          allowDeselect={false}
          {...form.getInputProps('method')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="Application rate"
            description={
              defaults
                ? `Depth applied per hour of running. Typical: ${defaults.rateMmH} mm/h`
                : 'Depth applied per hour of running'
            }
            placeholder={defaults ? String(defaults.rateMmH) : undefined}
            suffix=" mm/h"
            min={0}
            max={100}
            decimalScale={2}
            {...form.getInputProps('applicationRateMmH')}
          />
          <NumberInput
            label="Application efficiency"
            description={
              defaults
                ? `Share of pumped water that reaches the roots. Typical: ${Math.round(defaults.efficiency * 100)}%`
                : 'Share of pumped water that reaches the roots'
            }
            placeholder={defaults ? String(Math.round(defaults.efficiency * 100)) : undefined}
            suffix="%"
            min={30}
            max={100}
            {...form.getInputProps('efficiencyPct')}
          />
        </SimpleGrid>
        <Select
          label="Pump"
          description="Its power source and operating window set when irrigation can run, and its rating the energy estimate."
          placeholder={
            pumps.length
              ? 'Select the pump that feeds this field'
              : 'Add pumps under Infrastructure'
          }
          data={pumps.map((pump) => ({ value: pump.id, label: pump.name }))}
          clearable
          {...form.getInputProps('pumpAssetId')}
        />
        <Checkbox
          label="Soil is mulched"
          description="Organic or plastic mulch cuts evaporation; the irrigation-need model takes it into account."
          {...form.getInputProps('mulched', { type: 'checkbox' })}
        />
        <Text size="xs" c="dimmed">
          Leave the rate or efficiency blank to use the typical value for the method. A measured
          rate (catch-can test or flow meter ÷ area) makes run times much more accurate.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={configure.isPending}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
