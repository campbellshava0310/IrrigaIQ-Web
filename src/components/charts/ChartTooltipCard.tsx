import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface TooltipItem {
  dataKey?: unknown;
  name?: unknown;
  value?: unknown;
  color?: string;
  payload?: unknown;
}

/** The part of Recharts' tooltip props the card reads. */
export interface TooltipContent {
  active?: boolean;
  label?: unknown;
  payload?: readonly TooltipItem[];
}

export interface ChartTooltipOptions {
  /** Series labels by data key; series not listed are left out of the card. */
  series: Record<string, string>;
  format: (value: number, key: string) => string;
  /** Lines under the values that interpret the day (e.g. "Below the refill point"). */
  footer?: (row: Record<string, unknown>) => ReactNode;
  /** A crosshair line for line and area charts, a column band for bars. */
  cursor?: 'line' | 'band';
}

export function ChartTooltipCard({
  active,
  label,
  payload,
  series,
  format,
  footer,
}: TooltipContent & ChartTooltipOptions) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = (payload[0]?.payload ?? {}) as Record<string, unknown>;
  const items = payload.filter(
    (item) => typeof item.dataKey === 'string' && item.dataKey in series,
  );
  return (
    <Paper withBorder shadow="md" radius="md" px="sm" py={10} miw={190}>
      <Text size="xs" fw={600} c="dimmed" mb={6}>
        {String(label ?? '')}
      </Text>
      <Stack gap={4}>
        {items.map((item) => {
          const key = item.dataKey as string;
          return (
            <Group key={key} justify="space-between" gap="lg" wrap="nowrap">
              <Group gap={8} wrap="nowrap">
                <Box
                  w={8}
                  h={8}
                  style={{ borderRadius: 2, background: item.color, flexShrink: 0 }}
                  aria-hidden
                />
                <Text size="sm">{series[key]}</Text>
              </Group>
              <Text size="sm" fw={600} className="app-num">
                {typeof item.value === 'number' ? format(item.value, key) : '—'}
              </Text>
            </Group>
          );
        })}
      </Stack>
      {footer && <Box mt={8}>{footer(row)}</Box>}
    </Paper>
  );
}
