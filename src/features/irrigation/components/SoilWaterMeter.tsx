import { Box, Group, Text, Tooltip } from '@mantine/core';

import { formatPercent } from '@/lib/format';

import { WATER_STATUS } from '../presentation';
import type { WaterStatus } from '../types';

interface SoilWaterMeterProps {
  /** FAO-56 root-zone depletion (0 = field capacity, 100 = wilting point). */
  depletionPct: number;
  /** Depletion at which the crop starts to stress (RAW / TAW). */
  stressThresholdPct: number;
  status: WaterStatus;
  size?: 'sm' | 'md';
  showLabels?: boolean;
}

/**
 * Root-zone water as a tank level: full at field capacity, empty at wilting point. The marker is
 * the refill point, where the crop starts to stress. Farmers read "how full" faster than
 * "how depleted", so the FAO-56 depletion is inverted here and named in the tooltip.
 */
export function SoilWaterMeter({
  depletionPct,
  stressThresholdPct,
  status,
  size = 'md',
  showLabels = true,
}: SoilWaterMeterProps) {
  const available = clamp(100 - depletionPct);
  const refillAt = clamp(100 - stressThresholdPct);
  const color = WATER_STATUS[status].color;
  const height = size === 'sm' ? 8 : 12;
  const planted = status !== 'NOT_PLANTED' && status !== 'SEASON_ENDED';

  return (
    <Box>
      {showLabels && (
        <Group justify="space-between" gap="xs" mb={6} wrap="nowrap">
          <Text size="xs" c="dimmed">
            Soil water{' '}
            <Text span fw={700} c="var(--mantine-color-text)">
              {planted ? formatPercent(available) : '—'}
            </Text>
          </Text>
          {planted && (
            <Text size="xs" c="dimmed">
              Refill at {formatPercent(refillAt)}
            </Text>
          )}
        </Group>
      )}
      <Tooltip
        label={`Root zone ${formatPercent(available)} full (depletion ${formatPercent(
          depletionPct,
        )}); the crop stresses below ${formatPercent(refillAt)}.`}
        multiline
        w={260}
        disabled={!planted}
      >
        <Box
          role="meter"
          aria-label="Root-zone soil water"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(available)}
          aria-valuetext={`${Math.round(available)}% full, refill at ${Math.round(refillAt)}%`}
          pos="relative"
          h={height}
          style={{
            borderRadius: height,
            background: `var(--mantine-color-${planted ? color : 'gray'}-light)`,
          }}
        >
          {planted && (
            <>
              <Box
                h="100%"
                w={`${available}%`}
                style={{
                  borderRadius: height,
                  background: `var(--mantine-color-${color}-filled)`,
                  transition: 'width 300ms ease',
                }}
              />
              <Box
                aria-hidden
                pos="absolute"
                top={-3}
                bottom={-3}
                left={`calc(${refillAt}% - 1px)`}
                w={2}
                style={{ background: 'var(--mantine-color-text)', borderRadius: 1, opacity: 0.7 }}
              />
            </>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
