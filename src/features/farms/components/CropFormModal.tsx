import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';
import { z } from 'zod';

import { humanize } from '@/lib/format';
import { applyServerErrors, optionalNumber, optionalText } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useSaveCrop } from '../api';
import {
  CROP_TYPES,
  GROWTH_STAGE_LABELS,
  GROWTH_STAGES,
  TYPICAL_YIELD_T_HA,
  type Crop,
  type CropType,
  type GrowthStage,
} from '../types';

const schema = z.object({
  cropType: z.enum(CROP_TYPES, 'Select a crop'),
  variety: z.string().max(120),
  plantingDate: z.string().nullable(),
  growthStage: z.enum(GROWTH_STAGES, 'Select a growth stage'),
  expectedYieldTHa: z.union([
    z.literal(''),
    z.number().positive('Yield must be greater than zero'),
  ]),
});

const CROP_OPTIONS = CROP_TYPES.map((value) => ({ value, label: humanize(value) }));
const STAGE_OPTIONS = GROWTH_STAGES.map((value) => ({ value, label: GROWTH_STAGE_LABELS[value] }));

interface CropFormModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  fieldId: string;
  crop?: Crop;
}

export function CropFormModal({ opened, onClose, farmId, fieldId, crop }: CropFormModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={crop ? 'Edit crop' : 'Plant a crop'} centered>
      <CropForm
        key={crop?.id ?? 'new'}
        farmId={farmId}
        fieldId={fieldId}
        crop={crop}
        onClose={onClose}
      />
    </Modal>
  );
}

function CropForm({ farmId, fieldId, crop, onClose }: Omit<CropFormModalProps, 'opened'>) {
  const save = useSaveCrop(farmId, fieldId, crop?.id);
  const form = useForm({
    initialValues: {
      cropType: (crop?.cropType ?? null) as CropType | null,
      variety: crop?.variety ?? '',
      plantingDate: crop?.plantingDate ?? null,
      growthStage: (crop?.growthStage ?? 'INITIAL') as GrowthStage | null,
      expectedYieldTHa: (crop?.expectedYieldTHa ?? '') as number | '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  const handleSubmit = form.onSubmit((values) => {
    if (!values.cropType || !values.growthStage) {
      return; // unreachable: the schema requires both
    }
    save.mutate(
      {
        cropType: values.cropType,
        variety: optionalText(values.variety),
        plantingDate: values.plantingDate,
        growthStage: values.growthStage,
        expectedYieldTHa: optionalNumber(values.expectedYieldTHa),
      },
      {
        onSuccess: () => {
          notifySuccess(crop ? 'Crop updated' : 'Crop added');
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the crop"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Crop"
            data={CROP_OPTIONS}
            required
            data-autofocus
            {...form.getInputProps('cropType')}
          />
          <TextInput label="Variety" placeholder="e.g. Roma" {...form.getInputProps('variety')} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DateInput
            label="Planting date"
            valueFormat="DD MMM YYYY"
            clearable
            {...form.getInputProps('plantingDate')}
          />
          <Select
            label="Growth stage"
            description="FAO-56 stage"
            data={STAGE_OPTIONS}
            required
            {...form.getInputProps('growthStage')}
          />
        </SimpleGrid>
        <NumberInput
          label="Target yield"
          description="What this field yields with no water stress; used to estimate yield at risk."
          placeholder={
            form.values.cropType
              ? `Typical: ${TYPICAL_YIELD_T_HA[form.values.cropType]}`
              : undefined
          }
          suffix=" t/ha"
          min={0}
          decimalScale={2}
          {...form.getInputProps('expectedYieldTHa')}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {crop ? 'Save changes' : 'Add crop'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
