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
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { z } from 'zod';

import { applyServerErrors, optionalNumber, optionalText } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useSaveFarm } from '../api';
import type { Farm } from '../types';

const optionalNumberField = (min: number, max: number, message: string) =>
  z.union([z.literal(''), z.number().min(min, message).max(max, message)]);

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter a farm name').max(160),
    location: z.string().max(255),
    areaHa: z.union([z.literal(''), z.number().positive('Area must be greater than zero')]),
    latitude: optionalNumberField(-90, 90, 'Between -90 and 90'),
    longitude: optionalNumberField(-180, 180, 'Between -180 and 180'),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, 'Three-letter code, e.g. USD'),
    electricityTariff: optionalNumberField(0, 100, 'Enter the price per kWh'),
    baselineIntervalDays: optionalNumberField(1, 30, 'Between 1 and 30 days'),
    baselineDepthMm: optionalNumberField(1, 200, 'Between 1 and 200 mm'),
  })
  .refine((values) => (values.latitude === '') === (values.longitude === ''), {
    message: 'Enter both latitude and longitude',
    path: ['longitude'],
  });

const CURRENCIES = [
  'USD',
  'ZWG',
  'ZAR',
  'BWP',
  'ZMW',
  'MZN',
  'KES',
  'TZS',
  'UGX',
  'NGN',
  'GHS',
  'EUR',
  'GBP',
];

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['Africa/Harare', 'Africa/Johannesburg', 'Africa/Nairobi', 'Africa/Lagos', 'UTC'];
  }
}

interface FarmFormModalProps {
  opened: boolean;
  onClose: () => void;
  farm?: Farm;
  onSaved?: (farm: Farm) => void;
}

export function FarmFormModal({ opened, onClose, farm, onSaved }: FarmFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={farm ? 'Edit farm' : 'New farm'}
      size="lg"
      centered
    >
      <FarmForm key={farm?.id ?? 'new'} farm={farm} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function FarmForm({ farm, onClose, onSaved }: Omit<FarmFormModalProps, 'opened'>) {
  const save = useSaveFarm(farm?.id);
  const form = useForm({
    initialValues: {
      name: farm?.name ?? '',
      location: farm?.location ?? '',
      areaHa: (farm?.areaHa ?? '') as number | '',
      latitude: (farm?.latitude ?? '') as number | '',
      longitude: (farm?.longitude ?? '') as number | '',
      timezone: farm?.timezone ?? 'Africa/Harare',
      currency: farm?.currency ?? 'USD',
      electricityTariff: (farm?.electricityTariff ?? '') as number | '',
      baselineIntervalDays: (farm?.baselineIntervalDays ?? 3) as number | '',
      baselineDepthMm: (farm?.baselineDepthMm ?? 25) as number | '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  const handleSubmit = form.onSubmit((values) => {
    save.mutate(
      {
        name: values.name.trim(),
        location: optionalText(values.location),
        areaHa: optionalNumber(values.areaHa),
        latitude: optionalNumber(values.latitude),
        longitude: optionalNumber(values.longitude),
        timezone: values.timezone,
        currency: values.currency.trim().toUpperCase(),
        electricityTariff: optionalNumber(values.electricityTariff),
        baselineIntervalDays: optionalNumber(values.baselineIntervalDays),
        baselineDepthMm: optionalNumber(values.baselineDepthMm),
      },
      {
        onSuccess: (saved) => {
          notifySuccess(farm ? 'Farm updated' : `${saved.name} created`);
          onSaved?.(saved);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the farm"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Farm name"
            placeholder="e.g. Mazowe Estate"
            required
            data-autofocus
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Location"
            placeholder="District, province"
            {...form.getInputProps('location')}
          />
        </SimpleGrid>
        <NumberInput
          label="Total area"
          suffix=" ha"
          min={0}
          decimalScale={2}
          thousandSeparator=","
          maw={240}
          {...form.getInputProps('areaHa')}
        />

        <Divider label="Location for the weather forecast" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Latitude"
            placeholder="-17.8292"
            decimalScale={6}
            min={-90}
            max={90}
            {...form.getInputProps('latitude')}
          />
          <NumberInput
            label="Longitude"
            placeholder="31.0522"
            decimalScale={6}
            min={-180}
            max={180}
            {...form.getInputProps('longitude')}
          />
          <Select
            label="Time zone"
            data={timeZones()}
            searchable
            allowDeselect={false}
            {...form.getInputProps('timezone')}
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          From Google Maps: right-click the farm and copy the coordinates. Without them,
          fields&apos; coordinates are averaged, or an approximate location is used.
        </Text>

        <Divider label="Costs and savings" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Currency"
            data={CURRENCIES}
            searchable
            allowDeselect={false}
            {...form.getInputProps('currency')}
          />
          <NumberInput
            label="Grid electricity price"
            description="Per kWh, to cost pumping on grid power"
            prefix={`${form.values.currency} `}
            min={0}
            decimalScale={4}
            {...form.getInputProps('electricityTariff')}
          />
        </SimpleGrid>
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            How the farm irrigated before
          </Text>
          <Text size="xs" c="dimmed">
            The fixed schedule water savings are measured against, e.g. 25 mm every 3 days.
          </Text>
          <SimpleGrid cols={2}>
            <NumberInput
              aria-label="Baseline depth"
              suffix=" mm"
              min={1}
              max={200}
              decimalScale={1}
              {...form.getInputProps('baselineDepthMm')}
            />
            <NumberInput
              aria-label="Baseline interval"
              prefix="every "
              suffix=" days"
              min={1}
              max={30}
              {...form.getInputProps('baselineIntervalDays')}
            />
          </SimpleGrid>
        </Stack>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {farm ? 'Save changes' : 'Create farm'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
