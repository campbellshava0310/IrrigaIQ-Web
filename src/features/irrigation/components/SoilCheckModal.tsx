import {
  Button,
  Group,
  Modal,
  NumberInput,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useState } from 'react';

import { instantToLocal, localToInstant, optionalText } from '@/lib/forms';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useRecordObservation } from '../api';
import type { ObservationMethod } from '../types';

/**
 * The USDA NRCS "feel and appearance" method, condensed for loams: squeeze a handful of soil from
 * the middle of the root zone and pick what it does. Each level maps to a typical depletion.
 */
const FEEL_LEVELS = [
  { depletion: 5, label: 'Wet', hint: 'Water appears on the soil surface or drips when squeezed.' },
  { depletion: 20, label: 'Moist', hint: 'Forms a firm ball, leaves a wet outline on your hand.' },
  { depletion: 40, label: 'Slightly moist', hint: 'Forms a weak ball that breaks easily.' },
  { depletion: 60, label: 'Dry', hint: 'Holds together only slightly; crumbles when pressed.' },
  { depletion: 85, label: 'Very dry', hint: 'Loose and powdery; will not form a ball.' },
] as const;

interface SoilCheckModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  fieldId: string;
  fieldName: string;
}

export function SoilCheckModal({
  opened,
  onClose,
  farmId,
  fieldId,
  fieldName,
}: SoilCheckModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={`Soil check · ${fieldName}`} centered size="lg">
      <SoilCheckForm farmId={farmId} fieldId={fieldId} onClose={onClose} />
    </Modal>
  );
}

function SoilCheckForm({
  farmId,
  fieldId,
  onClose,
}: Omit<SoilCheckModalProps, 'opened' | 'fieldName'>) {
  const record = useRecordObservation(farmId);
  const [method, setMethod] = useState<ObservationMethod>('FEEL');
  const [feel, setFeel] = useState<string | null>(null);
  const [availablePct, setAvailablePct] = useState<number | ''>('');
  const [observedAt, setObservedAt] = useState<string | null>(() => instantToLocal(new Date()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const depletionPct =
      method === 'FEEL'
        ? feel == null
          ? null
          : Number(feel)
        : availablePct === ''
          ? null
          : 100 - availablePct;
    if (depletionPct == null) {
      setError(method === 'FEEL' ? 'Pick what the soil feels like' : 'Enter the reading');
      return;
    }
    record.mutate(
      {
        fieldId,
        input: {
          depletionPct,
          method,
          observedAt: localToInstant(observedAt),
          notes: optionalText(notes),
        },
      },
      {
        onSuccess: () => {
          notifySuccess(
            'The water balance has been recalibrated to your reading.',
            'Soil check saved',
          );
          onClose();
        },
        onError: (cause) => notifyError(cause, "Couldn't save the soil check"),
      },
    );
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        A soil check anchors the model to what is really in the ground. Take it in the middle of the
        root zone, between plants, before irrigating.
      </Text>
      <SegmentedControl
        fullWidth
        value={method}
        onChange={(value) => {
          setMethod(value as ObservationMethod);
          setError(null);
        }}
        data={[
          { value: 'FEEL', label: 'By feel' },
          { value: 'PROBE', label: 'Probe reading' },
          { value: 'TENSIOMETER', label: 'Tensiometer' },
        ]}
      />

      {method === 'FEEL' ? (
        <Radio.Group
          value={feel}
          onChange={(value) => {
            setFeel(value);
            setError(null);
          }}
          label="Squeeze a handful of soil. What does it do?"
          error={error}
        >
          <Stack gap="xs" mt="xs">
            {FEEL_LEVELS.map((level) => (
              <UnstyledButton
                key={level.depletion}
                component="label"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-md)',
                  padding: '10px 12px',
                  background:
                    feel === String(level.depletion)
                      ? 'var(--mantine-primary-color-light)'
                      : undefined,
                }}
              >
                <Group wrap="nowrap" align="flex-start">
                  <Radio value={String(level.depletion)} mt={2} aria-label={level.label} />
                  <div>
                    <Text size="sm" fw={600}>
                      {level.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {level.hint}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </Radio.Group>
      ) : (
        <NumberInput
          label="Soil water available"
          description="Share of the soil's available water still in the root zone: 100% right after a full irrigation, 0% at wilting point."
          suffix="%"
          min={0}
          max={100}
          decimalScale={0}
          value={availablePct}
          onChange={(value) => {
            setAvailablePct(typeof value === 'number' ? value : '');
            setError(null);
          }}
          error={error}
          data-autofocus
        />
      )}

      <DateTimePicker
        label="When"
        value={observedAt}
        onChange={setObservedAt}
        valueFormat="DD MMM YYYY HH:mm"
        maxDate={new Date()}
      />
      <Textarea
        label="Notes"
        placeholder="e.g. moist at 20 cm, dry below 40 cm"
        autosize
        minRows={2}
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} loading={record.isPending}>
          Save soil check
        </Button>
      </Group>
    </Stack>
  );
}
