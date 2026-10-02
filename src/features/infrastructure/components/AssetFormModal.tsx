import {
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';

import { useFields } from '@/features/farms/api';
import { applyServerErrors, optionalNumber, optionalText } from '@/lib/forms';
import { humanize } from '@/lib/format';
import { notifySuccess } from '@/lib/notify';

import { useAssets, useSaveAsset } from '../api';
import { ASSET_TYPE, CATEGORY, CRITICALITY } from '../presentation';
import {
  ASSET_TYPES,
  CRITICALITIES,
  POWER_SOURCES,
  type Asset,
  type AssetType,
  type Criticality,
} from '../types';
import type { PowerSource } from '@/features/irrigation/types';

const TYPE_OPTIONS = Object.entries(CATEGORY)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([category, meta]) => ({
    group: meta.label,
    items: (Object.keys(ASSET_TYPES) as AssetType[])
      .filter((type) => ASSET_TYPES[type] === category)
      .map((type) => ({ value: type, label: ASSET_TYPE[type].label })),
  }));

type Num = number | '';

interface AssetFormModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  asset?: Asset;
  defaults?: { type?: AssetType; parentId?: string; fieldId?: string };
  onSaved?: (asset: Asset) => void;
}

export function AssetFormModal({ opened, onClose, asset, ...props }: AssetFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={asset ? `Edit ${asset.name}` : 'Add infrastructure'}
      size="xl"
      centered
    >
      <AssetForm key={asset?.id ?? 'new'} asset={asset} onClose={onClose} {...props} />
    </Modal>
  );
}

function AssetForm({
  farmId,
  asset,
  defaults,
  onClose,
  onSaved,
}: Omit<AssetFormModalProps, 'opened'>) {
  const save = useSaveAsset(farmId, asset?.id);
  const fields = useFields(farmId);
  const assets = useAssets(farmId);
  const form = useForm({
    initialValues: {
      type: (asset?.type ?? defaults?.type ?? null) as AssetType | null,
      name: asset?.name ?? '',
      fieldId: asset?.fieldId ?? defaults?.fieldId ?? null,
      parentId: asset?.parentId ?? defaults?.parentId ?? null,
      manufacturer: asset?.manufacturer ?? '',
      model: asset?.model ?? '',
      serialNumber: asset?.serialNumber ?? '',
      installedOn: asset?.installedOn ?? null,
      criticality: (asset?.criticality ?? 'MEDIUM') as Criticality | null,
      powerSource: (asset?.powerSource ?? null) as PowerSource | null,
      ratedPowerKw: (asset?.ratedPowerKw ?? '') as Num,
      ratedFlowM3h: (asset?.ratedFlowM3h ?? '') as Num,
      ratedHeadM: (asset?.ratedHeadM ?? '') as Num,
      capacityM3: (asset?.capacityM3 ?? '') as Num,
      annualAllocationM3: (asset?.annualAllocationM3 ?? '') as Num,
      operatingWindowStart: asset?.operatingWindowStart?.slice(0, 5) ?? '',
      operatingWindowEnd: asset?.operatingWindowEnd?.slice(0, 5) ?? '',
      serviceIntervalDays: (asset?.serviceIntervalDays ?? '') as Num,
      serviceIntervalHours: (asset?.serviceIntervalHours ?? '') as Num,
      expectedLifeYears: (asset?.expectedLifeYears ?? '') as Num,
      lastServiceOn: asset?.lastServiceOn ?? null,
      baselineEnergyKwhPerM3: (asset?.baselineEnergyKwhPerM3 ?? '') as Num,
      operatingHours: (asset?.operatingHours ?? '') as Num,
      notes: asset?.notes ?? '',
    },
    validate: {
      type: (value) => (value ? null : 'Select the type'),
      name: (value) => (value.trim() ? null : 'Enter a name, e.g. "P-1 Borehole pump"'),
      operatingWindowEnd: (value, values) =>
        Boolean(value) !== Boolean(values.operatingWindowStart)
          ? 'Set both start and end, or neither'
          : null,
    },
  });

  const type = form.values.type;
  const category = type ? ASSET_TYPES[type] : null;
  const isPump = type === 'PUMP';
  const isPower = type === 'SOLAR_ARRAY' || type === 'GENERATOR';
  const isSource = category === 'WATER_SOURCE';
  const runHours = isPump || type === 'GENERATOR' || type === 'CENTER_PIVOT';
  const inField =
    category === 'APPLICATION' || category === 'DISTRIBUTION' || category === 'CONTROL';
  const parentOptions = (assets.data ?? [])
    .filter((candidate) => candidate.id !== asset?.id)
    .map((candidate) => ({
      value: candidate.id,
      label: `${candidate.name} · ${ASSET_TYPE[candidate.type].label}`,
    }));

  const handleSubmit = form.onSubmit((values) => {
    if (!values.type) {
      return;
    }
    save.mutate(
      {
        type: values.type,
        name: values.name.trim(),
        fieldId: values.fieldId,
        parentId: values.parentId,
        manufacturer: optionalText(values.manufacturer),
        model: optionalText(values.model),
        serialNumber: optionalText(values.serialNumber),
        installedOn: values.installedOn,
        criticality: values.criticality,
        status: asset?.status ?? null,
        powerSource: isPump || type === 'GENERATOR' ? values.powerSource : null,
        ratedPowerKw: optionalNumber(values.ratedPowerKw),
        ratedFlowM3h: optionalNumber(values.ratedFlowM3h),
        ratedHeadM: optionalNumber(values.ratedHeadM),
        capacityM3: optionalNumber(values.capacityM3),
        annualAllocationM3: optionalNumber(values.annualAllocationM3),
        operatingWindowStart: values.operatingWindowStart || null,
        operatingWindowEnd: values.operatingWindowEnd || null,
        serviceIntervalDays: optionalNumber(values.serviceIntervalDays),
        serviceIntervalHours: optionalNumber(values.serviceIntervalHours),
        expectedLifeYears: optionalNumber(values.expectedLifeYears),
        lastServiceOn: values.lastServiceOn,
        baselineEnergyKwhPerM3: optionalNumber(values.baselineEnergyKwhPerM3),
        operatingHours: optionalNumber(values.operatingHours),
        notes: optionalText(values.notes),
      },
      {
        onSuccess: (saved) => {
          notifySuccess(asset ? `${saved.name} updated` : `${saved.name} added`);
          onSaved?.(saved);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the asset"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Type"
            data={TYPE_OPTIONS}
            required
            searchable
            allowDeselect={false}
            disabled={Boolean(asset)}
            data-autofocus={!asset || undefined}
            {...form.getInputProps('type')}
          />
          <TextInput
            label="Name"
            placeholder="e.g. P-2 Dam pump"
            required
            {...form.getInputProps('name')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Select
            label="Criticality"
            description={
              form.values.criticality ? CRITICALITY[form.values.criticality].description : undefined
            }
            data={CRITICALITIES.map((value) => ({ value, label: CRITICALITY[value].label }))}
            allowDeselect={false}
            {...form.getInputProps('criticality')}
          />
          <Select
            label="Fed by (upstream)"
            description="Builds the water network map"
            placeholder="None"
            data={parentOptions}
            searchable
            clearable
            {...form.getInputProps('parentId')}
          />
          <Select
            label="Serves field"
            description={inField ? 'The field this system irrigates' : 'Optional'}
            placeholder="None"
            data={(fields.data ?? []).map((field) => ({ value: field.id, label: field.name }))}
            clearable
            {...form.getInputProps('fieldId')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          <TextInput label="Manufacturer" {...form.getInputProps('manufacturer')} />
          <TextInput label="Model" {...form.getInputProps('model')} />
          <TextInput label="Serial number" {...form.getInputProps('serialNumber')} />
          <DateInput
            label="Installed"
            valueFormat="DD MMM YYYY"
            maxDate={new Date()}
            clearable
            {...form.getInputProps('installedOn')}
          />
        </SimpleGrid>

        {(isPump || isPower) && (
          <>
            <Divider label="Rating & power" labelPosition="left" />
            <SimpleGrid cols={{ base: 1, sm: isPump ? 4 : 2 }}>
              {(isPump || type === 'GENERATOR') && (
                <Select
                  label="Power source"
                  data={POWER_SOURCES.map((value) => ({ value, label: humanize(value) }))}
                  clearable
                  {...form.getInputProps('powerSource')}
                />
              )}
              <NumberInput
                label={type === 'SOLAR_ARRAY' ? 'Peak power' : 'Rated power'}
                suffix={type === 'SOLAR_ARRAY' ? ' kWp' : ' kW'}
                min={0}
                decimalScale={2}
                {...form.getInputProps('ratedPowerKw')}
              />
              {isPump && (
                <>
                  <NumberInput
                    label="Rated flow"
                    suffix=" m³/h"
                    min={0}
                    decimalScale={2}
                    {...form.getInputProps('ratedFlowM3h')}
                  />
                  <NumberInput
                    label="Rated head"
                    suffix=" m"
                    min={0}
                    decimalScale={2}
                    {...form.getInputProps('ratedHeadM')}
                  />
                </>
              )}
            </SimpleGrid>
            {isPump && (
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TimeInput
                  label="Can run from"
                  description="Solar hours or load-shedding-free window"
                  {...form.getInputProps('operatingWindowStart')}
                />
                <TimeInput
                  label="Until"
                  description="May wrap past midnight"
                  {...form.getInputProps('operatingWindowEnd')}
                />
                <NumberInput
                  label="Baseline energy"
                  description="kWh per m³ when new or just serviced"
                  suffix=" kWh/m³"
                  min={0}
                  decimalScale={4}
                  {...form.getInputProps('baselineEnergyKwhPerM3')}
                />
              </SimpleGrid>
            )}
          </>
        )}

        {isSource && (
          <>
            <Divider label="Water" labelPosition="left" />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <NumberInput
                label="Storage capacity"
                suffix=" m³"
                min={0}
                thousandSeparator=","
                {...form.getInputProps('capacityM3')}
              />
              <NumberInput
                label="Annual abstraction allocation"
                description="Permitted volume per year (water permit)"
                suffix=" m³"
                min={0}
                thousandSeparator=","
                {...form.getInputProps('annualAllocationM3')}
              />
            </SimpleGrid>
          </>
        )}

        {(type === 'FILTER' || type === 'CENTER_PIVOT') && (
          <>
            <Divider label="Rating" labelPosition="left" />
            <NumberInput
              label="Rated flow"
              suffix=" m³/h"
              min={0}
              decimalScale={2}
              maw={260}
              {...form.getInputProps('ratedFlowM3h')}
            />
          </>
        )}

        <Divider label="Service plan" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: runHours ? 4 : 3 }}>
          <NumberInput
            label="Service every"
            suffix=" days"
            min={1}
            max={3650}
            {...form.getInputProps('serviceIntervalDays')}
          />
          {runHours && (
            <NumberInput
              label="or every"
              suffix=" run-hours"
              min={1}
              thousandSeparator=","
              {...form.getInputProps('serviceIntervalHours')}
            />
          )}
          <DateInput
            label="Last serviced"
            valueFormat="DD MMM YYYY"
            maxDate={new Date()}
            clearable
            {...form.getInputProps('lastServiceOn')}
          />
          <NumberInput
            label="Expected life"
            suffix=" years"
            min={1}
            max={100}
            {...form.getInputProps('expectedLifeYears')}
          />
        </SimpleGrid>
        {runHours && !asset && (
          <NumberInput
            label="Hour meter now"
            description="Run-hours are then added automatically from logged irrigation"
            suffix=" h"
            min={0}
            maw={260}
            thousandSeparator=","
            {...form.getInputProps('operatingHours')}
          />
        )}
        <Textarea
          label="Notes"
          autosize
          minRows={2}
          maxLength={1000}
          {...form.getInputProps('notes')}
        />
        {!type && (
          <Text size="xs" c="dimmed">
            Pick a type to see the fields that matter for it.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {asset ? 'Save changes' : 'Add asset'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
