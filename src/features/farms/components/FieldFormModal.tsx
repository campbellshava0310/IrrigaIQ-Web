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

import { humanize } from '@/lib/format';
import { applyServerErrors, optionalNumber } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useSaveField } from '../api';
import { SOIL_TYPES, type Field, type SoilType } from '../types';

const coordinate = (limit: number, label: string) =>
  z.union([
    z.literal(''),
    z.number().min(-limit, `${label} must be between -${limit} and ${limit}`).max(limit),
  ]);

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a field name').max(160),
  areaHa: z.union([z.literal(''), z.number().positive('Area must be greater than zero')]),
  soilType: z.enum(SOIL_TYPES).nullable(),
  latitude: coordinate(90, 'Latitude'),
  longitude: coordinate(180, 'Longitude'),
});

const SOIL_OPTIONS = SOIL_TYPES.map((value) => ({ value, label: humanize(value) }));

interface FieldFormModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  field?: Field;
}

export function FieldFormModal({ opened, onClose, farmId, field }: FieldFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={field ? 'Edit field' : 'New field'}
      centered
      size="lg"
    >
      <FieldForm key={field?.id ?? 'new'} farmId={farmId} field={field} onClose={onClose} />
    </Modal>
  );
}

function FieldForm({ farmId, field, onClose }: Omit<FieldFormModalProps, 'opened'>) {
  const save = useSaveField(farmId, field?.id);
  const form = useForm({
    initialValues: {
      name: field?.name ?? '',
      areaHa: (field?.areaHa ?? '') as number | '',
      soilType: (field?.soilType ?? null) as SoilType | null,
      latitude: (field?.latitude ?? '') as number | '',
      longitude: (field?.longitude ?? '') as number | '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  const handleSubmit = form.onSubmit((values) => {
    save.mutate(
      {
        name: values.name.trim(),
        areaHa: optionalNumber(values.areaHa),
        soilType: values.soilType,
        latitude: optionalNumber(values.latitude),
        longitude: optionalNumber(values.longitude),
      },
      {
        onSuccess: (saved) => {
          notifySuccess(field ? 'Field updated' : `${saved.name} added`);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the field"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Field name"
            placeholder="e.g. Field 01"
            required
            data-autofocus
            {...form.getInputProps('name')}
          />
          <NumberInput
            label="Area"
            suffix=" ha"
            min={0}
            decimalScale={2}
            {...form.getInputProps('areaHa')}
          />
        </SimpleGrid>
        <Select
          label="Soil texture"
          description="Drives water-holding capacity in the irrigation model"
          placeholder="Select soil texture"
          data={SOIL_OPTIONS}
          clearable
          searchable
          {...form.getInputProps('soilType')}
        />
        <div>
          <Text size="sm" fw={500}>
            Location
          </Text>
          <Text size="xs" c="dimmed" mb={6}>
            Decimal degrees, used for field-level weather forecasts
          </Text>
          <SimpleGrid cols={2}>
            <NumberInput
              placeholder="Latitude, e.g. -17.3912"
              decimalScale={6}
              {...form.getInputProps('latitude')}
            />
            <NumberInput
              placeholder="Longitude, e.g. 31.0735"
              decimalScale={6}
              {...form.getInputProps('longitude')}
            />
          </SimpleGrid>
        </div>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {field ? 'Save changes' : 'Add field'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
