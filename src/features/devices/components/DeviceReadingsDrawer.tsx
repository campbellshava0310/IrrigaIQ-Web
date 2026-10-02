import { Drawer, Group, SegmentedControl, Stack, Table, Text } from '@mantine/core';
import { useState } from 'react';

import { chartTooltip } from '@/components/charts/chartTooltip';
import { LoadingState } from '@/components/QueryStates';
import { LineChart } from '@/lib/charts';
import { formatNumber, formatRelative } from '@/lib/format';

import { useDeviceReadings } from '../api';
import { SENSOR_TYPE, latestSummary } from '../presentation';
import type { Device, HourlyReading } from '../types';

const HOUR = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** The one measure that matters for each device type (one measure per axis). */
const MEASURE: Record<
  Device['type'],
  { key: keyof HourlyReading; label: string; unit: string; color: string }
> = {
  SOIL_MOISTURE: {
    key: 'soilMoisturePct',
    label: 'Soil moisture',
    unit: '%',
    color: 'var(--viz-soil)',
  },
  FLOW_METER: { key: 'litresPerHour', label: 'Flow', unit: ' L/h', color: 'var(--viz-water)' },
  PUMP_MONITOR: {
    key: 'vibrationMmS',
    label: 'Vibration',
    unit: ' mm/s',
    color: 'var(--viz-equipment)',
  },
  WEATHER_STATION: {
    key: 'temperatureC',
    label: 'Temperature',
    unit: ' °C',
    color: 'var(--viz-temperature)',
  },
};

export function DeviceReadingsDrawer({
  farmId,
  device,
  onClose,
}: {
  farmId: string;
  device: Device | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const readings = useDeviceReadings(farmId, device?.id ?? null);
  const measure = device ? MEASURE[device.type] : null;
  const data = (readings.data?.hours ?? [])
    .filter((hour) => measure && hour[measure.key] != null)
    .map((hour) => ({
      label: HOUR.format(new Date(hour.hour)),
      value: Number(hour[measure!.key]),
    }));

  return (
    <Drawer
      opened={device != null}
      onClose={onClose}
      position="right"
      size="lg"
      title={device?.name}
    >
      {device && measure && (
        <Stack>
          <Text size="sm" c="dimmed">
            {SENSOR_TYPE[device.type].label} · {device.deviceId} · last reading{' '}
            {formatRelative(device.lastSeenAt)}
          </Text>
          <Text fw={600} className="app-num">
            Now: {latestSummary(device)}
          </Text>
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {measure.label}, last 48 hours (hourly means)
            </Text>
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
          {readings.isPending && <LoadingState label="Loading readings…" />}
          {readings.data && data.length === 0 && (
            <Text size="sm" c="dimmed">
              No {measure.label.toLowerCase()} readings in the last 48 hours.
            </Text>
          )}
          {data.length > 0 &&
            (view === 'chart' ? (
              <LineChart
                h={240}
                data={data}
                dataKey="label"
                series={[{ name: 'value', label: measure.label, color: measure.color }]}
                curveType="monotone"
                withDots={false}
                strokeWidth={2}
                gridAxis="x"
                strokeDasharray="0"
                gridProps={{ stroke: 'var(--viz-grid)' }}
                valueFormatter={(value) => `${formatNumber(value, 1)}${measure.unit}`}
                tooltipProps={chartTooltip({
                  series: { value: measure.label },
                  format: (value) => `${formatNumber(value, 1)}${measure.unit}`,
                })}
                xAxisProps={{ minTickGap: 32 }}
                yAxisProps={{ width: 56, tickFormatter: (value: number) => formatNumber(value) }}
              />
            ) : (
              <Table.ScrollContainer minWidth={320} maxHeight={420}>
                <Table
                  striped
                  stickyHeader
                  verticalSpacing={6}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Hour</Table.Th>
                      <Table.Th ta="right">{measure.label}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {[...data].reverse().map((row) => (
                      <Table.Tr key={row.label}>
                        <Table.Td>{row.label}</Table.Td>
                        <Table.Td ta="right">
                          {formatNumber(row.value, 1)}
                          {measure.unit}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ))}
        </Stack>
      )}
    </Drawer>
  );
}
