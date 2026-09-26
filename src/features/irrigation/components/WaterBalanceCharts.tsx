import { AreaChart, CompositeChart } from '@/lib/charts';
import { Card, Group, SegmentedControl, Stack, Table, Text } from '@mantine/core';
import { useState, type ReactNode } from 'react';

import { formatDayMonth, formatNumber } from '@/lib/format';

import type { BalanceDay } from '../types';

interface WaterBalanceChartsProps {
  days: BalanceDay[];
  today: string;
  /** Dim the charts while a new range loads instead of flashing a skeleton. */
  refreshing?: boolean;
  /** Filters (e.g. the date range) shown in the same row as the chart/table switch. */
  toolbar?: ReactNode;
}

const GRID = { stroke: 'var(--viz-grid)' };

/**
 * Two aligned small multiples instead of one dual-axis chart: the root-zone "tank" (percent) and
 * the daily water flows that move it (mm). Forecast days are shaded; every value is also in the
 * table view.
 */
export function WaterBalanceCharts({
  days,
  today,
  refreshing = false,
  toolbar,
}: WaterBalanceChartsProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const data = days.map((day) => ({
    date: day.date,
    label: formatDayMonth(day.date),
    water: round(100 - day.depletionPct),
    refill: round(100 - day.stressThresholdPct),
    irrigation: round(day.irrigationMm),
    rain: round(day.rainMm),
    etc: round(day.etcMm),
  }));
  const todayLabel = data.find((row) => row.date === today)?.label;
  const lastLabel = data.at(-1)?.label;
  const forecastArea =
    todayLabel && lastLabel && todayLabel !== lastLabel
      ? [
          {
            x1: todayLabel,
            x2: lastLabel,
            fill: 'var(--viz-forecast-wash)',
            fillOpacity: 1,
            label: 'Forecast',
            labelPosition: 'insideTopRight' as const,
          },
        ]
      : [];
  const todayLine = todayLabel
    ? [
        {
          x: todayLabel,
          color: 'var(--viz-reference)',
          label: 'Today',
          labelPosition: 'insideTopLeft' as const,
        },
      ]
    : [];

  return (
    <Stack gap="md" style={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <Group justify="space-between">
        {toolbar ?? <span />}
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
      </Group>

      {view === 'chart' ? (
        <>
          <Card withBorder padding="md">
            <Text fw={600} size="sm">
              Soil water in the root zone
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              100% = full after a thorough irrigation. Below the refill point the crop is stressed
              and yield starts to fall.
            </Text>
            <AreaChart
              h={260}
              data={data}
              dataKey="label"
              series={[
                { name: 'water', label: 'Soil water', color: 'var(--viz-series-1)' },
                { name: 'refill', label: 'Refill point', color: 'var(--viz-reference)' },
              ]}
              curveType="linear"
              withDots={false}
              strokeWidth={2}
              fillOpacity={0.1}
              withGradient={false}
              areaProps={(series) =>
                series.name === 'refill'
                  ? { fillOpacity: 0, strokeDasharray: '6 4', strokeWidth: 1.5 }
                  : {}
              }
              yAxisProps={{ domain: [0, 100], ticks: [0, 25, 50, 75, 100] }}
              valueFormatter={(value) => `${formatNumber(value)}%`}
              gridAxis="x"
              strokeDasharray="0"
              gridProps={GRID}
              withLegend
              legendProps={{ verticalAlign: 'bottom', height: 36 }}
              referenceAreas={forecastArea}
              referenceLines={todayLine}
              xAxisProps={{ minTickGap: 24 }}
            />
          </Card>

          <Card withBorder padding="md">
            <Text fw={600} size="sm">
              Daily water in and crop water use (mm)
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Irrigation and rain refill the root zone; the crop draws it down at its daily water
              use (ETc = Kc × ET₀). Future bars are planned irrigation and forecast rain.
            </Text>
            <CompositeChart
              h={240}
              data={data}
              dataKey="label"
              series={[
                {
                  name: 'irrigation',
                  label: 'Irrigation',
                  color: 'var(--viz-series-1)',
                  type: 'bar',
                },
                { name: 'rain', label: 'Rain', color: 'var(--viz-series-2)', type: 'bar' },
                {
                  name: 'etc',
                  label: 'Crop water use',
                  color: 'var(--viz-series-3)',
                  type: 'line',
                },
              ]}
              curveType="linear"
              withDots={false}
              maxBarWidth={10}
              barProps={{ radius: [4, 4, 0, 0] }}
              yAxisProps={{ width: 40, tickFormatter: (value: number) => formatNumber(value) }}
              valueFormatter={(value) => `${formatNumber(value, 1)} mm`}
              gridAxis="x"
              strokeDasharray="0"
              gridProps={GRID}
              withLegend
              legendProps={{ verticalAlign: 'bottom', height: 36 }}
              referenceAreas={forecastArea}
              referenceLines={todayLine}
              xAxisProps={{ minTickGap: 24 }}
            />
          </Card>
        </>
      ) : (
        <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
          <Table.ScrollContainer minWidth={640} maxHeight={520}>
            <Table
              stickyHeader
              striped
              verticalSpacing={6}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th ta="right">Soil water</Table.Th>
                  <Table.Th ta="right">Refill point</Table.Th>
                  <Table.Th ta="right">Irrigation</Table.Th>
                  <Table.Th ta="right">Rain</Table.Th>
                  <Table.Th ta="right">Crop use</Table.Th>
                  <Table.Th ta="right">Stress factor</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {days.map((day, index) => (
                  <Table.Tr key={day.date} fw={day.date === today ? 700 : undefined}>
                    <Table.Td>
                      {data[index]?.label}
                      {day.date === today ? ' (today)' : day.forecast ? ' (forecast)' : ''}
                    </Table.Td>
                    <Table.Td ta="right">{formatNumber(100 - day.depletionPct)}%</Table.Td>
                    <Table.Td ta="right">{formatNumber(100 - day.stressThresholdPct)}%</Table.Td>
                    <Table.Td ta="right">
                      {day.irrigationMm > 0 ? `${formatNumber(day.irrigationMm, 1)} mm` : '—'}
                    </Table.Td>
                    <Table.Td ta="right">
                      {day.rainMm > 0 ? `${formatNumber(day.rainMm, 1)} mm` : '—'}
                    </Table.Td>
                    <Table.Td ta="right">{formatNumber(day.etcMm, 1)} mm</Table.Td>
                    <Table.Td ta="right">{formatNumber(day.ks, 2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed" p="sm">
            Stress factor (Ks): 1 = no stress; below 1 the crop transpires, and grows, less than it
            could.
          </Text>
        </Card>
      )}
    </Stack>
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
