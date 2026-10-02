import { Group, Text, VisuallyHidden } from '@mantine/core';
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from '@tabler/icons-react';

import { changePct } from '@/lib/change';
import { formatNumber } from '@/lib/format';

interface DeltaProps {
  current: number;
  previous: number | null | undefined;
  /** Which direction is good news; omit when a change is neither (water applied, say). */
  good?: 'up' | 'down';
  /** What it is compared with, e.g. "last week". */
  period: string;
}

/** "↗ 12% vs last week": the arrow and number are coloured only when the direction means something. */
export function Delta({ current, previous, good, period }: DeltaProps) {
  const pct = changePct(current, previous);
  if (pct == null) {
    return (
      <Text size="xs" c="dimmed">
        No comparison for {period}
      </Text>
    );
  }
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const color = flat || !good ? 'dimmed' : up === (good === 'up') ? 'green' : 'red';
  const Arrow = flat ? IconArrowRight : up ? IconArrowUpRight : IconArrowDownRight;
  // Past +200% a multiple reads faster than a percentage ("7.6×" rather than "657%").
  const amount =
    pct >= 200
      ? `${formatNumber(pct / 100 + 1, 1)}×`
      : `${formatNumber(Math.abs(pct), Math.abs(pct) < 10 ? 1 : 0)}%`;
  const spoken = flat ? `No change vs ${period}` : `${up ? 'Up' : 'Down'} ${amount} vs ${period}`;
  return (
    <Group gap={4} wrap="nowrap">
      <VisuallyHidden>{spoken}</VisuallyHidden>
      <Group gap={2} wrap="nowrap" c={color} aria-hidden>
        <Arrow size={14} stroke={2} aria-hidden />
        <Text size="xs" fw={600} c={color} className="app-num" aria-hidden>
          {flat ? 'Flat' : amount}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" truncate aria-hidden>
        vs {period}
      </Text>
    </Group>
  );
}
