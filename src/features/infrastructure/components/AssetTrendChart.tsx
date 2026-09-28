import { chartTooltip } from '@/components/charts/chartTooltip';
import { LineChart } from '@/lib/charts';
import { Card, Group, SegmentedControl, Table, Text } from '@mantine/core';
import { useState } from 'react';

import { formatDayMonth, formatNumber, formatWhen } from '@/lib/format';

import type { Asset, ConditionCheck } from '../types';

interface TrendSpec {
  title: string;
  description: string;
  unit: string;
  digits: number;
  value: (check: ConditionCheck) => number | null;
  reference: { y: number; label: string } | null;
  /** Depth below ground reads naturally with deeper = lower on the chart. */
  reversed?: boolean;
}

function specFor(asset: Asset): TrendSpec | null {
  if (asset.type === 'PUMP') {
    const baseline =
      asset.baselineEnergyKwhPerM3 ??
      (asset.ratedPowerKw && asset.ratedFlowM3h ? asset.ratedPowerKw / asset.ratedFlowM3h : null);
    return {
      title: 'Energy per cubic metre pumped',
      description:
        'The earliest sign of pump wear: as impellers and wear rings open up, the pump burns more power for the same water. +10% is a warning, +20% needs action.',
      unit: ' kWh/m³',
      digits: 3,
      value: (check) => check.energyKwhPerM3,
      reference: baseline ? { y: baseline * 1.2, label: 'Action level (+20%)' } : null,
    };
  }
  if (asset.type === 'FILTER') {
    return {
      title: 'Filter differential pressure',
      description:
        'Pressure lost across the filter. Rising ΔP means it is clogging; clean it at 0.5 bar before flow to the field drops.',
      unit: ' bar',
      digits: 2,
      value: (check) => check.filterDpBar,
      reference: { y: 0.5, label: 'Clean at 0.5 bar' },
    };
  }
  if (asset.type === 'BOREHOLE' || asset.type === 'RESERVOIR' || asset.type === 'STORAGE_TANK') {
    return {
      title: 'Water level',
      description:
        'Depth to water. A steady fall through the dry season is normal; a fast fall warns that pumping is outrunning recharge, or that the pump may soon run dry.',
      unit: ' m',
      digits: 2,
      value: (check) => check.waterLevelM,
      reference: null,
      reversed: true,
    };
  }
  return null;
}

/** One measure per chart (no second axis); every value is also in the table view. */
export function AssetTrendChart({ asset, checks }: { asset: Asset; checks: ConditionCheck[] }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const spec = specFor(asset);
  if (!spec) {
    return null;
  }
  const points = checks
    .map((check) => ({ check, value: spec.value(check) }))
    .filter((point): point is { check: ConditionCheck; value: number } => point.value != null)
    .sort((a, b) => a.check.checkedAt.localeCompare(b.check.checkedAt));
  const data = points.map(({ check, value }) => ({
    label: formatDayMonth(check.checkedAt.slice(0, 10)),
    value: Math.round(value * 10 ** spec.digits) / 10 ** spec.digits,
  }));

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" align="flex-start" mb="xs" gap="xs">
        <div>
          <Text fw={600} fz="md">
            {spec.title} ({spec.unit.trim()})
          </Text>
          <Text size="xs" c="dimmed" maw={640}>
            {spec.description}
          </Text>
        </div>
        {points.length > 0 && (
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(value) => setView(value as 'chart' | 'table')}
            data={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
            aria-label="Show as"
          />
        )}
      </Group>
      {points.length < 2 ? (
        <Text size="sm" c="dimmed" py="md">
          {points.length === 0
            ? 'No readings yet. Record a condition check with these measurements to start the trend.'
            : 'One reading so far. The trend appears from the second check.'}
        </Text>
      ) : view === 'chart' ? (
        <LineChart
          h={220}
          data={data}
          dataKey="label"
          series={[{ name: 'value', label: spec.title, color: 'var(--viz-equipment)' }]}
          curveType="linear"
          strokeWidth={2}
          dotProps={{ r: 4, strokeWidth: 2, stroke: 'var(--mantine-color-body)' }}
          activeDotProps={{ r: 5, strokeWidth: 2, stroke: 'var(--mantine-color-body)' }}
          valueFormatter={(value) => `${formatNumber(value, spec.digits)}${spec.unit}`}
          yAxisProps={{
            domain: ['auto', 'auto'],
            reversed: spec.reversed,
            width: 48,
            tickFormatter: (value: number) => formatNumber(value, spec.digits),
          }}
          gridAxis="x"
          strokeDasharray="0"
          gridProps={{ stroke: 'var(--viz-grid)' }}
          tooltipProps={chartTooltip({
            series: { value: spec.title },
            format: (value) => `${formatNumber(value, spec.digits)}${spec.unit}`,
            footer: (row) =>
              spec.reference ? (
                Number(row.value) >= spec.reference.y ? (
                  <Text size="xs" c="red">
                    At or past the {spec.reference.label.toLowerCase()}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed" className="app-num">
                    {formatNumber(
                      (100 * (spec.reference.y - Number(row.value))) / spec.reference.y,
                    )}
                    % below the {spec.reference.label.toLowerCase()}
                  </Text>
                )
              ) : null,
          })}
          referenceLines={
            spec.reference
              ? [
                  {
                    y: spec.reference.y,
                    label: spec.reference.label,
                    color: 'var(--viz-reference)',
                    strokeDasharray: '6 4',
                    labelPosition: 'insideTopRight',
                  },
                ]
              : []
          }
        />
      ) : (
        <Table.ScrollContainer
          minWidth={360}
          maxHeight={260}
          scrollAreaProps={{ viewportProps: { tabIndex: 0, 'aria-label': 'Scrollable table' } }}
        >
          <Table striped verticalSpacing={6} style={{ fontVariantNumeric: 'tabular-nums' }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Checked</Table.Th>
                <Table.Th ta="right">{spec.title}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...points].reverse().map(({ check, value }) => (
                <Table.Tr key={check.id}>
                  <Table.Td>{formatWhen(check.checkedAt)}</Table.Td>
                  <Table.Td ta="right">
                    {formatNumber(value, spec.digits)}
                    {spec.unit}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}
