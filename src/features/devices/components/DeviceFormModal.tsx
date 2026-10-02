import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { z } from 'zod';

import { useFields } from '@/features/farms/api';
import { useAssets } from '@/features/infrastructure/api';
import { applyServerErrors, optionalNumber, optionalText } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useRegisterDevice, useUpdateDevice } from '../api';
import { SENSOR_TYPE } from '../presentation';
import { SENSOR_TYPES, type Device, type IssuedKey, type SensorType } from '../types';

const percent = z.union([z.literal(''), z.number().min(0).max(100)]);

const schema = z
  .object({
    type: z.enum(SENSOR_TYPES),
    deviceId: z
      .string()
      .trim()
      .min(1, 'Enter the device’s hardware id')
      .max(128)
      .regex(/^[A-Za-z0-9:._-]+$/, 'Letters, digits and : . _ - only'),
    name: z.string().max(160),
    fieldId: z.string().nullable(),
    assetId: z.string().nullable(),
    fieldCapacityPct: percent,
    wiltingPointPct: percent,
  })
  .superRefine((values, context) => {
    if (values.type === 'SOIL_MOISTURE' && !values.fieldId) {
      context.addIssue({
        code: 'custom',
        path: ['fieldId'],
        message: 'A probe must be placed in a field',
      });
    }
    if (values.type === 'PUMP_MONITOR' && !values.assetId) {
      context.addIssue({
        code: 'custom',
        path: ['assetId'],
        message: 'Choose the pump it is fitted to',
      });
    }
    if (values.type === 'FLOW_METER' && !values.assetId && !values.fieldId) {
      context.addIssue({
        code: 'custom',
        path: ['assetId'],
        message: 'Choose the pump, line or field it meters',
      });
    }
    const fc = values.fieldCapacityPct;
    const wp = values.wiltingPointPct;
    if ((fc === '') !== (wp === '')) {
      context.addIssue({
        code: 'custom',
        path: ['wiltingPointPct'],
        message: 'Enter both readings, or neither',
      });
    } else if (fc !== '' && wp !== '' && fc <= wp) {
      context.addIssue({
        code: 'custom',
        path: ['wiltingPointPct'],
        message: 'Must be below field capacity',
      });
    }
  });

interface DeviceFormModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  device?: Device;
  onRegistered: (issued: IssuedKey) => void;
}

export function DeviceFormModal({
  opened,
  onClose,
  farmId,
  device,
  onRegistered,
}: DeviceFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={device ? 'Edit device' : 'Register a device'}
      centered
      size="lg"
    >
      <DeviceForm
        key={device?.id ?? 'new'}
        farmId={farmId}
        device={device}
        onClose={onClose}
        onRegistered={onRegistered}
      />
    </Modal>
  );
}

function DeviceForm({
  farmId,
  device,
  onClose,
  onRegistered,
}: Omit<DeviceFormModalProps, 'opened'>) {
  const register = useRegisterDevice(farmId);
  const update = useUpdateDevice(farmId);
  const fields = useFields(farmId);
  const assets = useAssets(farmId);
  const form = useForm({
    initialValues: {
      type: (device?.type ?? 'SOIL_MOISTURE') as SensorType,
      deviceId: device?.deviceId ?? '',
      name: device?.name && device.name !== device.deviceId ? device.name : '',
      fieldId: device?.fieldId ?? null,
      assetId: device?.assetId ?? null,
      fieldCapacityPct: (device?.fieldCapacityPct ?? '') as number | '',
      wiltingPointPct: (device?.wiltingPointPct ?? '') as number | '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });
  const type = form.values.type;
  const pumps = (assets.data ?? []).filter((asset) => asset.type === 'PUMP');
  const assetOptions = (type === 'PUMP_MONITOR' ? pumps : (assets.data ?? [])).map((asset) => ({
    value: asset.id,
    label: asset.name,
  }));
  const fieldOptions = (fields.data ?? []).map((field) => ({ value: field.id, label: field.name }));

  const handleSubmit = form.onSubmit((values) => {
    const input = {
      name: optionalText(values.name),
      fieldId: values.fieldId,
      assetId: values.type === 'SOIL_MOISTURE' ? null : values.assetId,
      fieldCapacityPct:
        values.type === 'SOIL_MOISTURE' ? optionalNumber(values.fieldCapacityPct) : null,
      wiltingPointPct:
        values.type === 'SOIL_MOISTURE' ? optionalNumber(values.wiltingPointPct) : null,
    };
    if (device) {
      update.mutate(
        { id: device.id, input: { ...input, status: device.status } },
        {
          onSuccess: () => {
            notifySuccess('Device updated');
            onClose();
          },
          onError: (error) => applyServerErrors(form, error, "Couldn't save the device"),
        },
      );
      return;
    }
    register.mutate(
      { ...input, type: values.type, deviceId: values.deviceId.trim() },
      {
        onSuccess: (issued) => {
          onClose();
          onRegistered(issued);
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't register the device"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Type"
            data={SENSOR_TYPES.map((value) => ({ value, label: SENSOR_TYPE[value].label }))}
            description={SENSOR_TYPE[type].placement}
            allowDeselect={false}
            disabled={Boolean(device)}
            {...form.getInputProps('type')}
          />
          <TextInput
            label="Hardware id"
            description="Printed on the device or its MAC address"
            placeholder="e.g. esp32-block-a"
            required
            disabled={Boolean(device)}
            data-autofocus={!device || undefined}
            {...form.getInputProps('deviceId')}
          />
        </SimpleGrid>
        <TextInput
          label="Name"
          placeholder="e.g. Soil probe · Block A"
          {...form.getInputProps('name')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {type !== 'PUMP_MONITOR' && (
            <Select
              label="Field"
              placeholder="Select a field"
              data={fieldOptions}
              clearable={type !== 'SOIL_MOISTURE'}
              searchable
              required={type === 'SOIL_MOISTURE'}
              {...form.getInputProps('fieldId')}
            />
          )}
          {type !== 'SOIL_MOISTURE' && (
            <Select
              label={type === 'PUMP_MONITOR' ? 'Pump' : 'Asset'}
              placeholder={type === 'PUMP_MONITOR' ? 'Select a pump' : 'Pump, line or source'}
              data={assetOptions}
              clearable={type !== 'PUMP_MONITOR'}
              searchable
              required={type === 'PUMP_MONITOR'}
              {...form.getInputProps('assetId')}
            />
          )}
        </SimpleGrid>
        {type === 'SOIL_MOISTURE' && (
          <div>
            <Text size="sm" fw={500}>
              Calibration (optional)
            </Text>
            <Text size="xs" c="dimmed" mb={6}>
              The probe&apos;s reading a day after a full irrigation drains (field capacity) and
              when the crop wilts. Leave empty to use 40% and 15%.
            </Text>
            <SimpleGrid cols={2}>
              <NumberInput
                placeholder="Field capacity, e.g. 38"
                suffix="%"
                min={0}
                max={100}
                decimalScale={1}
                aria-label="Field capacity reading"
                {...form.getInputProps('fieldCapacityPct')}
              />
              <NumberInput
                placeholder="Wilting point, e.g. 16"
                suffix="%"
                min={0}
                max={100}
                decimalScale={1}
                aria-label="Wilting point reading"
                {...form.getInputProps('wiltingPointPct')}
              />
            </SimpleGrid>
          </div>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={register.isPending || update.isPending}>
            {device ? 'Save' : 'Register and get key'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
