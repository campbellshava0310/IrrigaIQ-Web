import { CompositeChart } from '@/lib/charts';
import {
  Anchor,
  Badge,
  Card,
  Grid,
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconDroplet, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { SortTh } from '@/components/table/SortTh';
import { useSort } from '@/components/table/useSort';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { chartTooltip } from '@/components/charts/chartTooltip';
import { Delta } from '@/components/Delta';
import { Metric, MetricStrip, type MetricTone } from '@/components/MetricStrip';
import { TrendLine } from '@/components/TrendLine';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { ASSET_TYPE } from '@/features/infrastructure/presentation';
import {
  addDays,
  formatDayMonth,
  formatMoney,
  formatNumber,
  formatPercent,
  formatVolume,
  toIsoDate,
} from '@/lib/format';

import { useWaterSummary } from '../api';
import type { WaterSummary } from '../types';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
];

/** Applied vs crop need: below 85% the crop goes short, above 115% water drains past the roots. */
function adequacy(pct: number | null): { label: string; color: string; tone?: MetricTone } {
  if (pct == null) return { label: 'No crop demand', color: 'gray' };
  if (pct < 85) return { label: 'Under-irrigating', color: 'orange', tone: 'serious' };
  if (pct <= 115) return { label: 'On target', color: 'green', tone: 'good' };
  return { label: 'Over-irrigating', color: 'red', tone: 'critical' };
}

export function WaterPage() {
  return <RequireFarm>{(farm) => <WaterAccounting farm={farm} />}</RequireFarm>;
}

function WaterAccounting({ farm }: { farm: Farm }) {
  const [range, setRange] = useState('30');
  const today = new Date();
  const summary = useWaterSummary(
    farm.id,
    toIsoDate(addDays(today, -Number(range) + 1)),
    toIsoDate(today),
  );

  return (
    <>
      <PageHeader
        title="Water"
        description="Water applied against crop need and a calendar schedule."
        help="How much water went on, what the crops actually needed, and what a fixed calendar schedule would have used, with pumping energy and each source's licensed allocation."
        actions={
          <SegmentedControl value={range} onChange={setRange} data={RANGES} aria-label="Period" />
        }
      />
      {summary.isPending && <LoadingState layout="page" label="Adding up the water…" />}
      {summary.isError && <ErrorState error={summary.error} onRetry={() => summary.refetch()} />}
      {summary.data && (
        <div style={{ opacity: summary.isPlaceholderData ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <WaterReport summary={summary.data} farm={farm} />
        </div>
      )}
    </>
  );
}

function WaterReport({ summary, farm }: { summary: WaterSummary; farm: Farm }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const fit = adequacy(summary.adequacyPct);
  const previous = summary.previous;
  const period = `prior ${summary.daily.length} days`;
  const data = summary.daily.map((day) => ({
    label: formatDayMonth(day.date),
    applied: Math.round(day.appliedM3),
    requirement: Math.round(day.requirementM3),
  }));
  const byField = useSort(summary.fields, {
    field: (field) => field.fieldName,
    applied: (field) => field.appliedM3,
    need: (field) => field.requirementM3,
    met: (field) => (field.requirementM3 > 0 ? field.appliedM3 / field.requirementM3 : null),
    baseline: (field) => field.baselineM3,
    saved: (field) => field.savedM3,
    runs: (field) => field.irrigations,
  });

  if (summary.fields.length === 0) {
    return (
      <EmptyState
        icon={<IconDroplet size={24} />}
        title="No planted fields"
        description="Water accounting starts once fields have crops and irrigation is being logged."
      />
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap={8}>
        <MetricStrip label="Water for this period">
          <Metric
            label="Water saved"
            value={Math.max(0, summary.savedM3)}
            unit="m³"
            delta={
              <Delta
                current={summary.savedM3}
                previous={previous?.savedM3}
                good="up"
                period={period}
              />
            }
            hint={
              summary.savedPct != null
                ? `${formatPercent(summary.savedPct)} less than a calendar schedule (${formatVolume(summary.baselineM3)})`
                : 'No comparison available for this period'
            }
          />
          <Metric
            label="Applied"
            value={summary.appliedM3}
            unit="m³"
            delta={
              <Delta current={summary.appliedM3} previous={previous?.appliedM3} period={period} />
            }
            hint={
              summary.plannedM3 > 0
                ? `${formatVolume(summary.plannedM3)} more planned`
                : 'Completed irrigation'
            }
            trend={
              <TrendLine
                values={summary.daily.map((day) => day.appliedM3)}
                color="var(--viz-water)"
                variant="bars"
                label="Water applied per day in this period"
              />
            }
          />
          <Metric
            label="Crop need"
            value={summary.requirementM3}
            unit="m³"
            delta={
              <Delta
                current={summary.requirementM3}
                previous={previous?.requirementM3}
                period={period}
              />
            }
            hint="Crop use minus useful rain, at your system efficiency"
          />
          <Metric
            label="Need met"
            value={summary.adequacyPct != null ? `${formatNumber(summary.adequacyPct)}%` : '—'}
            tone={fit.tone}
            hint={fit.label}
          />
          <Metric
            label="Pumping energy"
            value={summary.energyKwh}
            unit="kWh"
            delta={
              <Delta
                current={summary.energyKwh}
                previous={previous?.energyKwh}
                good="down"
                period={period}
              />
            }
            hint={
              summary.energyCost != null
                ? `${formatMoney(summary.energyCost, summary.currency)} on grid power`
                : 'Set a tariff to cost it'
            }
            trend={
              <TrendLine
                values={summary.daily.map((day) => day.energyKwh)}
                color="var(--viz-equipment)"
                variant="bars"
                label="Pumping energy per day in this period"
              />
            }
          />
        </MetricStrip>
        <Text size="xs" c="dimmed">
          Savings are measured against {summary.baselineDescription.toLowerCase()}.{' '}
          <Anchor component={Link} to={`/farms/${farm.id}`} size="xs">
            Change the baseline
          </Anchor>{' '}
          to match how the farm was irrigated before.
        </Text>
      </Stack>

      <Card withBorder>
        <Group justify="space-between" align="flex-start" mb="md" gap="xs">
          <div>
            <Text fw={600} fz="md">
              Daily water applied vs crop need (m³)
            </Text>
            <Text size="sm" c="dimmed">
              Irrigation arrives in pulses while the crop draws steadily; over a week the two should
              roughly match.
            </Text>
          </div>
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
          <CompositeChart
            h={260}
            data={data}
            dataKey="label"
            series={[
              { name: 'applied', label: 'Applied', color: 'var(--viz-water)', type: 'bar' },
              {
                name: 'requirement',
                label: 'Crop need',
                color: 'var(--viz-soil)',
                type: 'line',
              },
            ]}
            curveType="monotone"
            withDots={false}
            maxBarWidth={16}
            barProps={{ radius: [4, 4, 0, 0] }}
            valueFormatter={(value) => `${formatNumber(value)} m³`}
            tooltipProps={chartTooltip({
              series: { applied: 'Applied', requirement: 'Crop need' },
              format: (value) => `${formatNumber(value)} m³`,
              cursor: 'band',
              footer: (row) =>
                Number(row.requirement) > 0 ? (
                  <Text size="xs" c="dimmed" className="app-num">
                    {formatPercent((100 * Number(row.applied)) / Number(row.requirement))} of the
                    day&apos;s need; irrigation arrives in pulses
                  </Text>
                ) : null,
            })}
            gridAxis="x"
            strokeDasharray="0"
            gridProps={{ stroke: 'var(--viz-grid)' }}
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 36 }}
            xAxisProps={{ minTickGap: 24 }}
            yAxisProps={{ width: 56, tickFormatter: (value: number) => formatNumber(value) }}
          />
        ) : (
          <Table.ScrollContainer
            minWidth={480}
            maxHeight={360}
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
                  <Table.Th>Date</Table.Th>
                  <Table.Th ta="right">Applied</Table.Th>
                  <Table.Th ta="right">Crop need</Table.Th>
                  <Table.Th ta="right">Rain</Table.Th>
                  <Table.Th ta="right">ET₀</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.daily.map((day) => (
                  <Table.Tr key={day.date}>
                    <Table.Td>{formatDayMonth(day.date)}</Table.Td>
                    <Table.Td ta="right">{formatVolume(day.appliedM3)}</Table.Td>
                    <Table.Td ta="right">{formatVolume(day.requirementM3)}</Table.Td>
                    <Table.Td ta="right">{formatNumber(day.rainMm, 1)} mm</Table.Td>
                    <Table.Td ta="right">{formatNumber(day.et0Mm, 1)} mm</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card withBorder padding={0} className="app-table-card">
            <Text fw={600} fz="md" px="md" py="md">
              By field
            </Text>
            <div className="app-table-scroll">
              <Table
                stickyHeader
                miw={640}
                verticalSpacing="sm"
                style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <SortTh sort={byField.header('field')}>Field</SortTh>
                    <SortTh sort={byField.header('applied')} ta="right">
                      Applied
                    </SortTh>
                    <SortTh sort={byField.header('need')} ta="right">
                      Crop need
                    </SortTh>
                    <SortTh sort={byField.header('met')} ta="right">
                      Need met
                    </SortTh>
                    <SortTh sort={byField.header('baseline')} ta="right">
                      Calendar would use
                    </SortTh>
                    <SortTh sort={byField.header('saved')} ta="right">
                      Saved
                    </SortTh>
                    <SortTh sort={byField.header('runs')} ta="right">
                      Runs
                    </SortTh>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {byField.sorted.map((field) => {
                    const pct =
                      field.requirementM3 > 0
                        ? (100 * field.appliedM3) / field.requirementM3
                        : null;
                    const status = adequacy(pct);
                    return (
                      <Table.Tr key={field.fieldId}>
                        <Table.Td>
                          <Anchor
                            component={Link}
                            to={`/farms/${farm.id}/fields/${field.fieldId}`}
                            size="sm"
                            fw={600}
                          >
                            {field.fieldName}
                          </Anchor>
                        </Table.Td>
                        <Table.Td ta="right">{formatVolume(field.appliedM3)}</Table.Td>
                        <Table.Td ta="right">{formatVolume(field.requirementM3)}</Table.Td>
                        <Table.Td ta="right">
                          <Tooltip label={status.label}>
                            <Badge variant="light" color={status.color}>
                              {formatPercent(pct)}
                            </Badge>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td ta="right">{formatVolume(field.baselineM3)}</Table.Td>
                        <Table.Td ta="right" c={field.savedM3 >= 0 ? undefined : 'red'}>
                          {formatVolume(field.savedM3)}
                        </Table.Td>
                        <Table.Td ta="right">{field.irrigations}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card withBorder h="100%">
            <Group gap={6} mb="md">
              <Text fw={600} fz="md">
                Allocations this year
              </Text>
              <Tooltip
                label="Water drawn from each licensed source since 1 January, through the pumps it feeds, against its annual permit."
                multiline
                w={260}
              >
                <IconInfoCircle size={16} color="var(--mantine-color-dimmed)" />
              </Tooltip>
            </Group>
            {summary.allocations.length === 0 ? (
              <Text size="sm" c="dimmed">
                Add an annual allocation to your borehole or dam (Infrastructure) to track it
                against your water permit.
              </Text>
            ) : (
              <Stack gap="md">
                {summary.allocations.map((allocation) => {
                  const color =
                    allocation.usedPct >= 90
                      ? 'red'
                      : allocation.usedPct >= 75
                        ? 'orange'
                        : 'green';
                  return (
                    <Stack key={allocation.assetId} gap={4}>
                      <Group justify="space-between" wrap="nowrap">
                        <Anchor
                          component={Link}
                          to={`/farms/${farm.id}/assets/${allocation.assetId}`}
                          size="sm"
                          fw={600}
                          truncate
                        >
                          {allocation.name}
                        </Anchor>
                        <Text size="sm" fw={600} className="app-num">
                          {formatPercent(allocation.usedPct)}
                        </Text>
                      </Group>
                      <Progress
                        value={Math.min(100, allocation.usedPct)}
                        color={color}
                        aria-label={`${allocation.name} allocation used`}
                      />
                      <Text size="xs" c="dimmed">
                        {formatVolume(allocation.usedYearToDateM3)} of{' '}
                        {formatVolume(allocation.annualAllocationM3)} ·{' '}
                        {ASSET_TYPE[allocation.type].label}
                      </Text>
                    </Stack>
                  );
                })}
              </Stack>
            )}
            {summary.unattributedYearToDateM3 > 0 && (
              <Text size="xs" c="dimmed" mt="md">
                {formatVolume(summary.unattributedYearToDateM3)} this year came through pumps not
                linked to a source. Link pumps to what feeds them to attribute it.
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
