import { Badge, Box, Collapse, Group, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconChevronDown,
  IconCircleCheck,
  IconSparkles,
} from '@tabler/icons-react';

import { assistant } from '@/features/assistant/store';
import { formatNumber, formatRelative } from '@/lib/format';

import { NEED, formatProbability } from '../presentation';
import type { FieldAssessment } from '../types';

/** Inputs that are categories: a "typical" value (the most common one) says nothing useful there. */
const CATEGORICAL = new Set(['Crop_Growth_Stage', 'Mulching_Used']);

/**
 * The irrigation-need model's second opinion on a field card: its rating, how sure it is, whether
 * it agrees with the water balance, and the readings that drove it.
 */
export function ModelOpinion({
  assessment,
  available,
}: {
  assessment: FieldAssessment | undefined;
  available: boolean;
}) {
  const [opened, drivers] = useDisclosure(false);
  if (!assessment || assessment.status === 'NO_CROP') {
    return null;
  }
  const prediction = assessment.prediction;
  const inputs = assessment.inputs;
  if (!available || !prediction || !inputs) {
    return (
      <Text size="xs" c="dimmed">
        Irrigation-need model offline: this recommendation uses the water balance alone.
      </Text>
    );
  }
  const need = NEED[prediction.need];
  const agreement = assessment.agreement;
  const probe = inputs.soilMoistureSource === 'PROBE';

  return (
    <Box className="app-ai" p="sm">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" className="app-ai-label">
          <IconSparkles size={13} />
          Irrigation-need model
        </Group>
        <Group gap={6} wrap="nowrap">
          <Badge variant="dot" color={need.color} size="sm">
            {need.label}
          </Badge>
          <Tooltip label="The model's probability for its rating" withArrow>
            <Text size="xs" c="dimmed" className="app-num">
              {formatProbability(prediction.confidence)} sure
            </Text>
          </Tooltip>
        </Group>
      </Group>

      {agreement && (
        <Group gap={6} wrap="nowrap" align="flex-start" mt={6}>
          {agreement.consistent ? (
            <IconCircleCheck
              size={15}
              color="var(--mantine-color-green-filled)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          ) : (
            <IconAlertTriangle
              size={15}
              color="var(--mantine-color-yellow-filled)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          )}
          <Text size="xs" style={{ flex: 1 }}>
            {agreement.note}
          </Text>
        </Group>
      )}

      {probe && inputs.probeReadingPct != null && (
        <Text size="xs" c="dimmed" mt={4}>
          Soil moisture from {inputs.probeName ?? 'the probe'}:{' '}
          {formatNumber(inputs.probeReadingPct, 1)}% ({formatNumber(inputs.depletionPct)}%
          depleted), {formatRelative(inputs.probeReadAt)}
        </Text>
      )}

      <UnstyledButton onClick={drivers.toggle} aria-expanded={opened} mt={6}>
        <Group gap={4}>
          <Text size="xs" fw={500} c="dimmed">
            What drove the rating
          </Text>
          <IconChevronDown
            size={12}
            style={{
              transform: opened ? 'rotate(180deg)' : undefined,
              transition: 'transform 150ms',
            }}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>
        <Stack gap={4} mt={6}>
          {prediction.drivers.length === 0 && (
            <Text size="xs" c="dimmed">
              No single reading stands out: conditions are close to typical.
            </Text>
          )}
          {prediction.drivers.map((driver) => (
            <Group key={driver.feature} gap={6} wrap="nowrap">
              {driver.direction === 'raises' ? (
                <IconArrowUpRight size={14} color="var(--mantine-color-orange-filled)" />
              ) : (
                <IconArrowDownRight size={14} color="var(--mantine-color-green-filled)" />
              )}
              <Text size="xs" style={{ flex: 1 }}>
                {driver.label} <b className="app-num">{driver.value}</b>{' '}
                <Text span size="xs" c="dimmed">
                  {CATEGORICAL.has(driver.feature) ? '' : `(typical ${driver.typical}) `}
                  {driver.direction} the need
                </Text>
              </Text>
            </Group>
          ))}
          {prediction.outOfRange.map((warning) => (
            <Text key={warning} size="xs" c="yellow.8">
              {warning}: treat this rating with caution.
            </Text>
          ))}
          <Group justify="space-between" gap="xs" mt={2}>
            <Text size="xs" c="dimmed">
              Trained on benchmark data; a second opinion, not the schedule.
            </Text>
            <UnstyledButton
              onClick={() =>
                assistant.open(`Why does ${assessment.fieldName} need water, and how sure are you?`)
              }
            >
              <Text size="xs" c="blue" fw={500}>
                Ask IrrigaIQ
              </Text>
            </UnstyledButton>
          </Group>
        </Stack>
      </Collapse>
    </Box>
  );
}
