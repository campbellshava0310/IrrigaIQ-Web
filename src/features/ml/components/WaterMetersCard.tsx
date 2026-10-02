import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  List,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { chartTooltip } from '@/components/charts/chartTooltip';
import { assistant } from '@/features/assistant/store';
import { CompositeChart } from '@/lib/charts';
import { formatNumber, formatRelative } from '@/lib/format';

import { useWaterAnomalies } from '../api';
import { METER_STATUS } from '../presentation';
import type { MeterCheck } from '../types';

const HOUR = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Water meters checked against their own history: an unusual flow is flagged as a possibility
 * with its likely causes, never as a confirmed leak.
 */
export function WaterMetersCard({ farmId }: { farmId: string }) {
  const anomalies = useWaterAnomalies(farmId);
  const meters = anomalies.data?.meters ?? [];

  return (
    <Card withBorder>
      <Group justify="space-between" align="flex-start" mb="md" gap="xs">
        <div>
          <Title order={2}>Water meters</Title>
          <Text size="sm" c="dimmed">
            Hourly flow against what each meter normally records at that hour, with and without
            scheduled irrigation.
          </Text>
        </div>
        {anomalies.data && (
          <Text size="xs" c="dimmed">
            Checked {formatRelative(anomalies.data.checkedAt)}
          </Text>
        )}
      </Group>
      {anomalies.isPending && (
        <Text size="sm" c="dimmed">
          Checking meters…
        </Text>
      )}
      {anomalies.data && meters.length === 0 && (
        <Text size="sm" c="dimmed">
          No water meters yet. A meter on a pump or mainline lets IrrigaIQ spot leaks, valves left
          open and blockages.{' '}
          <Anchor component={Link} to="/devices" size="sm">
            Register a meter
          </Anchor>
        </Text>
      )}
      <Stack gap="xl">
        {meters.map((meter) => (
          <MeterPanel key={meter.deviceId} meter={meter} />
        ))}
      </Stack>
    </Card>
  );
}

function MeterPanel({ meter }: { meter: MeterCheck }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const status = METER_STATUS[meter.status];
  const anomaly = meter.anomaly;
  const where = meter.assetName ?? meter.fieldName;
  const data = meter.hours.map((point) => ({
    label: HOUR.format(new Date(point.hour)),
    observed: point.anomalous ? null : point.observedLitres,
    flagged: point.anomalous ? point.observedLitres : null,
    expected: point.expectedLitres,
  }));

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="xs" wrap="wrap">
        <div>
          <Text fw={600}>{meter.meterName}</Text>
          <Text size="xs" c="dimmed">
            {where ? `On ${where} · ` : ''}last reading {formatRelative(meter.lastReadingAt)}
          </Text>
        </div>
        <Group gap="xs">
          <Badge variant="dot" color={status.color}>
            {status.label}
          </Badge>
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(value) => setView(value as 'chart' | 'table')}
            data={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
            aria-label={`Show ${meter.meterName} as`}
          />
        </Group>
      </Group>

      {anomaly && (
        <Alert
          variant="light"
          color={anomaly.severity === 'HIGH' ? 'red' : 'orange'}
          icon={<IconAlertTriangle size={18} />}
          title={anomaly.headline}
        >
          <Text size="sm">
            About <b className="app-num">{formatNumber(anomaly.observedLitresPerHour)} L/h</b> since{' '}
            {HOUR.format(new Date(anomaly.from))}, against{' '}
            <b className="app-num">{formatNumber(anomaly.expectedLitresPerHour)} L/h</b> normally
            {anomaly.duringScheduledIrrigation
              ? ' during scheduled irrigation'
              : ' with no irrigation scheduled'}
            .
          </Text>
          <Text size="sm" fw={600} mt="xs">
            Possible causes
          </Text>
          <List size="sm" spacing={2}>
            {anomaly.possibleCauses.map((cause) => (
              <List.Item key={cause}>{cause}</List.Item>
            ))}
          </List>
          <Button
            mt="sm"
            size="compact-sm"
            variant="default"
            onClick={() =>
              assistant.open(
                `Explain the possible water anomaly on ${meter.meterName} and how to check it.`,
              )
            }
          >
            Ask IrrigaIQ how to check
          </Button>
        </Alert>
      )}
      {!anomaly && meter.status !== 'OK' && (
        <Text size="sm" c="dimmed">
          {status.description}
        </Text>
      )}

      {data.length > 0 &&
        (view === 'chart' ? (
          <CompositeChart
            h={220}
            data={data}
            dataKey="label"
            series={[
              { name: 'observed', label: 'Observed', color: 'var(--viz-water)', type: 'bar' },
              { name: 'flagged', label: 'Flagged', color: 'var(--viz-critical)', type: 'bar' },
              { name: 'expected', label: 'Expected', color: 'var(--viz-reference)', type: 'line' },
            ]}
            curveType="monotone"
            withDots={false}
            maxBarWidth={10}
            barProps={{ radius: [2, 2, 0, 0], stackId: 'flow' }}
            valueFormatter={(value) => `${formatNumber(value)} L/h`}
            tooltipProps={chartTooltip({
              series: { observed: 'Observed', flagged: 'Flagged', expected: 'Expected' },
              format: (value) => `${formatNumber(value)} L/h`,
              cursor: 'band',
            })}
            gridAxis="x"
            strokeDasharray="0"
            gridProps={{ stroke: 'var(--viz-grid)' }}
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 36 }}
            xAxisProps={{ minTickGap: 32 }}
            yAxisProps={{ width: 64, tickFormatter: (value: number) => formatNumber(value) }}
          />
        ) : (
          <Table.ScrollContainer
            minWidth={420}
            maxHeight={300}
            scrollAreaProps={{ viewportProps: { tabIndex: 0, 'aria-label': 'Scrollable table' } }}
          >
            <Table
              striped
              stickyHeader
              verticalSpacing={6}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Hour</Table.Th>
                  <Table.Th ta="right">Observed (L/h)</Table.Th>
                  <Table.Th ta="right">Expected (L/h)</Table.Th>
                  <Table.Th>Scheduled</Table.Th>
                  <Table.Th>Flag</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...meter.hours].reverse().map((point) => (
                  <Table.Tr key={point.hour}>
                    <Table.Td>{HOUR.format(new Date(point.hour))}</Table.Td>
                    <Table.Td ta="right">{formatNumber(point.observedLitres)}</Table.Td>
                    <Table.Td ta="right">{formatNumber(point.expectedLitres)}</Table.Td>
                    <Table.Td>{point.scheduled ? 'Yes' : 'No'}</Table.Td>
                    <Table.Td>{point.anomalous ? 'Unusual' : ''}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ))}
      {meter.modelVersion && (
        <Text size="xs" c="dimmed">
          Robust hourly baseline and Isolation Forest, fitted to this meter&apos;s own history. A
          meter shows that water moved, not why.
        </Text>
      )}
    </Stack>
  );
}
