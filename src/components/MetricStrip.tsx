import { Box, Card, Group, Skeleton, Text, UnstyledButton } from '@mantine/core';
import { IconArrowUpRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { formatNumber } from '@/lib/format';
import { useCountUp } from '@/lib/useCountUp';

/** The one way to show headline numbers: a single card divided into cells, never a grid of tiles. */
export function MetricStrip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card
      withBorder
      padding={0}
      className="app-metric-strip"
      component="section"
      aria-label={label}
    >
      {children}
    </Card>
  );
}

export type MetricTone = 'critical' | 'serious' | 'warning' | 'good';

const TONE_COLOR: Record<MetricTone, string> = {
  critical: 'var(--mantine-color-red-filled)',
  serious: 'var(--mantine-color-orange-filled)',
  warning: 'var(--mantine-color-yellow-filled)',
  good: 'var(--mantine-color-green-filled)',
};

interface MetricProps {
  label: string;
  /** Numbers ease into place; pass a string for values that are not counts (money, dates, names). */
  value: number | string;
  format?: (value: number) => string;
  unit?: ReactNode;
  /** Usually a <Delta>. */
  delta?: ReactNode;
  hint?: ReactNode;
  /** Usually a <TrendLine>. */
  trend?: ReactNode;
  /** A status dot beside the label; the hint must say why in words. */
  tone?: MetricTone;
  /** Opens the screen that explains the number. */
  to?: string;
  loading?: boolean;
  /** A smaller value, for names and dates rather than figures. */
  compact?: boolean;
}

export function Metric({
  label,
  value,
  format,
  unit,
  delta,
  hint,
  trend,
  tone,
  to,
  loading = false,
  compact = false,
}: MetricProps) {
  const body = (
    <>
      <Group gap={8} wrap="nowrap" pr={to ? 20 : 0}>
        {tone && (
          <Box
            w={7}
            h={7}
            style={{ borderRadius: 7, background: TONE_COLOR[tone], flexShrink: 0 }}
            aria-hidden
          />
        )}
        <Text size="sm" fw={500} c="dimmed" lineClamp={2} lh={1.3} title={label}>
          {label}
        </Text>
      </Group>
      {loading ? (
        <Skeleton h={28} w={72} mt={10} radius="sm" />
      ) : (
        <Text
          component="div"
          mt={10}
          fz={compact ? 'lg' : 26}
          fw={600}
          lh={compact ? 1.3 : 1.1}
          lts={compact ? -0.2 : -0.5}
          className="app-num"
          truncate={compact}
        >
          {typeof value === 'number' ? <CountUp value={value} format={format} /> : value}
          {unit && (
            <Text span fz="sm" fw={500} c="dimmed" lts={0} ml={4}>
              {unit}
            </Text>
          )}
        </Text>
      )}
      {delta && <Box mt={8}>{delta}</Box>}
      {hint && (
        <Text component="div" size="xs" c="dimmed" mt={delta ? 4 : 8} lineClamp={2}>
          {hint}
        </Text>
      )}
      {trend && (
        <Box mt="auto" pt={12}>
          {trend}
        </Box>
      )}
      {to && <IconArrowUpRight size={16} className="app-metric-go" aria-hidden />}
    </>
  );
  if (to) {
    return (
      <UnstyledButton component={Link} to={to} className="app-metric" data-link>
        {body}
      </UnstyledButton>
    );
  }
  return <Box className="app-metric">{body}</Box>;
}

function CountUp({
  value,
  format = (n) => formatNumber(n),
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const shown = useCountUp(value);
  return <>{format(value === shown ? value : shown)}</>;
}
