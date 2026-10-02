import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconBolt } from '@tabler/icons-react';

import { formatNumber } from '@/lib/format';
import {
  applyServerErrors,
  instantToLocal,
  localToInstant,
  optionalNumber,
  optionalText,
} from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useRecordCheck } from '../api';
import { VIBRATION, checkFieldsFor } from '../presentation';
import type { Asset, OverallCondition, VibrationLevel } from '../types';

interface ConditionCheckModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  asset: Asset;
}

/**
 * A walk-round inspection. The readings asked for depend on the asset: pumps give flow and power
 * (energy per m³ is the earliest sign of wear), filters give differential pressure, sources give
 * water level.
 */
export function ConditionCheckModal({ opened, onClose, farmId, asset }: ConditionCheckModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Condition check · ${asset.name}`}
      size="lg"
      centered
    >
      <CheckForm farmId={farmId} asset={asset} onClose={onClose} />
    </Modal>
  );
}

type Num = number | '';

function CheckForm({
  farmId,
  asset,
  onClose,
}: {
  farmId: string;
  asset: Asset;
  onClose: () => void;
}) {
  const record = useRecordCheck(farmId, asset.id);
  const show = checkFieldsFor(asset.type);
  const form = useForm({
    initialValues: {
      checkedAt: instantToLocal(new Date()) as string | null,
      overallCondition: 'GOOD' as OverallCondition,
      flowM3h: '' as Num,
      powerKw: '' as Num,
      pressureBar: '' as Num,
      hourMeter: '' as Num,
      vibration: 'NORMAL' as VibrationLevel,
      leakDetected: false,
      filterDpBar: '' as Num,
      waterLevelM: '' as Num,
      notes: '',
    },
  });
  const { values } = form;
  const energy =
    values.flowM3h !== '' && values.powerKw !== '' && values.flowM3h > 0
      ? values.powerKw / values.flowM3h
      : null;
  const baseline =
    asset.baselineEnergyKwhPerM3 ??
    (asset.ratedPowerKw && asset.ratedFlowM3h ? asset.ratedPowerKw / asset.ratedFlowM3h : null);
  const drift = energy != null && baseline ? (energy / baseline - 1) * 100 : null;

  const handleSubmit = form.onSubmit((submitted) => {
    record.mutate(
      {
        checkedAt: localToInstant(submitted.checkedAt),
        overallCondition: submitted.overallCondition,
        pressureBar: optionalNumber(submitted.pressureBar),
        flowM3h: optionalNumber(submitted.flowM3h),
        powerKw: optionalNumber(submitted.powerKw),
        hourMeter: optionalNumber(submitted.hourMeter),
        vibration: show.vibration ? submitted.vibration : null,
        leakDetected: submitted.leakDetected,
        filterDpBar: optionalNumber(submitted.filterDpBar),
        waterLevelM: optionalNumber(submitted.waterLevelM),
        notes: optionalText(submitted.notes),
      },
      {
        onSuccess: () => {
          notifySuccess('Health score and service forecast updated.', 'Condition check saved');
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the check"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Overall condition
          </Text>
          <SegmentedControl
            fullWidth
            data={[
              { value: 'GOOD', label: 'Good' },
              { value: 'FAIR', label: 'Fair: some wear' },
              { value: 'POOR', label: 'Poor: needs repair' },
            ]}
            {...form.getInputProps('overallCondition')}
          />
        </Stack>

        {show.pump && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <NumberInput
                label="Flow"
                description="From the flow meter while running"
                suffix=" m³/h"
                min={0}
                decimalScale={2}
                {...form.getInputProps('flowM3h')}
              />
              <NumberInput
                label="Power draw"
                description="From the meter, VFD or clamp meter"
                suffix=" kW"
                min={0}
                decimalScale={2}
                {...form.getInputProps('powerKw')}
              />
            </SimpleGrid>
            {energy != null && (
              <Alert
                variant="light"
                color={
                  drift != null && drift >= 20
                    ? 'red'
                    : drift != null && drift >= 10
                      ? 'orange'
                      : 'green'
                }
                icon={<IconBolt size={18} />}
              >
                {formatNumber(energy, 3)} kWh per m³
                {drift != null &&
                  ` · ${drift >= 0 ? '+' : ''}${formatNumber(drift, 0)}% against the ${formatNumber(baseline, 3)} baseline`}
                {drift != null &&
                  drift >= 10 &&
                  '. Rising energy per m³ usually means impeller or wear-ring wear, or a suction restriction.'}
              </Alert>
            )}
          </>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {show.pressure && (
            <NumberInput
              label="Pressure"
              suffix=" bar"
              min={0}
              max={100}
              decimalScale={2}
              {...form.getInputProps('pressureBar')}
            />
          )}
          {show.filter && (
            <NumberInput
              label="Differential pressure"
              description="Inlet minus outlet; clean below 0.5 bar"
              suffix=" bar"
              min={0}
              max={10}
              decimalScale={2}
              {...form.getInputProps('filterDpBar')}
            />
          )}
          {show.waterLevel && (
            <NumberInput
              label="Water level"
              description="Metres below ground (dip meter)"
              suffix=" m"
              decimalScale={2}
              {...form.getInputProps('waterLevelM')}
            />
          )}
          {show.hourMeter && (
            <NumberInput
              label="Hour meter"
              suffix=" h"
              min={0}
              thousandSeparator=","
              {...form.getInputProps('hourMeter')}
            />
          )}
        </SimpleGrid>

        {show.vibration && (
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Vibration and noise
            </Text>
            <SegmentedControl
              fullWidth
              data={(Object.keys(VIBRATION) as VibrationLevel[]).map((level) => ({
                value: level,
                label: VIBRATION[level].label,
              }))}
              {...form.getInputProps('vibration')}
            />
            <Text size="xs" c="dimmed">
              {VIBRATION[values.vibration].hint}
            </Text>
          </Stack>
        )}

        {show.leak && (
          <Checkbox
            label="Leak found"
            description="Weeping joints, wet patches along the line, dripping seals"
            {...form.getInputProps('leakDetected', { type: 'checkbox' })}
          />
        )}

        <DateTimePicker
          label="Checked"
          valueFormat="DD MMM YYYY HH:mm"
          maxDate={new Date()}
          {...form.getInputProps('checkedAt')}
        />
        <Textarea
          label="Notes"
          autosize
          minRows={2}
          maxLength={1000}
          placeholder="What you saw, heard or fixed"
          {...form.getInputProps('notes')}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={record.isPending}>
            Save check
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
