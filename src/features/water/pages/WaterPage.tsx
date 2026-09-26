import { CompositeChart } from '@/lib/charts';
import {
  Anchor,
  Badge,
  Card,
  Grid,
  Group,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconBolt,
  IconDroplet,
  IconInfoCircle,
  IconPigMoney,
  IconPlant2,
  IconTarget,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
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
function adequacy(pct: number | null): { label: string; color: string } {
  if (pct == null) return { label: 'No crop demand', color: 'gray' };
  if (pct < 85) return { label: 'Under-irrigating', color: 'orange' };
  if (pct <= 115) return { label: 'On target', color: 'teal' };
  return { label: 'Over-irrigating', color: 'red' };
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
        description="How much water went on, what the crops actually needed, and what a fixed calendar schedule would have used. Energy and each source's licensed allocation too."
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
  const data = summary.daily.map((day) => ({
    label: formatDayMonth(day.date),
    applied: Math.round(day.appliedM3),
    requirement: Math.round(day.requirementM3),
  }));

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
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder h="100%">
            <Group gap={10} mb="md">
              <ThemeIcon variant="light" color="teal" size={28} radius="sm">
                <IconPigMoney size={16} />
              </ThemeIcon>
              <Text size="sm" fw={500} c="dimmed">
                Water saved
              </Text>
            </Group>
            <Text fz={44} fw={650} lh={1.05} lts={-1.2} c="teal" className="app-num">
              {formatVolume(Math.max(0, summary.savedM3))}
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {summary.savedPct != null
                ? `${formatPercent(summary.savedPct)} less than a calendar schedule would have used (${formatVolume(summary.baselineM3)}).`
                : 'No comparison available for this period.'}
            </Text>
            <Text size="xs" c="dimmed" mt="md">
              Baseline: {summary.baselineDescription}.{' '}
              <Anchor component={Link} to={`/farms/${farm.id}`} size="xs">
                Change it
              </Anchor>{' '}
              on the farm to match how the farm was irrigated before.
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <SimpleGrid cols={2} spacing="md" h="100%">
            <StatCard
              label="Applied"
              value={formatVolume(summary.appliedM3)}
              hint={
                summary.plannedM3 > 0
                  ? `${formatVolume(summary.plannedM3)} more planned`
                  : 'Completed irrigation'
              }
              icon={<IconDroplet size={16} />}
              color="blue"
            />
            <StatCard
              label="Crop need"
              value={formatVolume(summary.requirementM3)}
              hint="Crop use minus useful rain, at your system efficiency"
              icon={<IconPlant2 size={16} />}
              color="teal"
            />
            <StatCard
              label="Need met"
              value={formatPercent(summary.adequacyPct)}
              hint={
                <Badge variant="dot" color={fit.color} size="sm">
                  {fit.label}
                </Badge>
              }
              icon={<IconTarget size={16} />}
              color={fit.color}
            />
            <StatCard
              label="Pumping energy"
              value={formatNumber(summary.energyKwh)}
              unit="kWh"
              hint={
                summary.energyCost != null
                  ? `${formatMoney(summary.energyCost, summary.currency)} on grid power`
                  : 'Set a tariff to cost it'
              }
              icon={<IconBolt size={16} />}
              color="yellow"
            />
          </SimpleGrid>
        </Grid.Col>
      </Grid>

      <Card withBorder>
        <Group justify="space-between" align="flex-start" mb="md" gap="xs">
          <div>
            <Text fw={650} fz="lg">
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
              { name: 'applied', label: 'Applied', color: 'var(--viz-series-1)', type: 'bar' },
              {
                name: 'requirement',
                label: 'Crop need',
                color: 'var(--viz-series-2)',
                type: 'line',
              },
            ]}
            curveType="monotone"
            withDots={false}
            maxBarWidth={16}
            barProps={{ radius: [4, 4, 0, 0] }}
            valueFormatter={(value) => `${formatNumber(value)} m³`}
            gridAxis="x"
            strokeDasharray="0"
            gridProps={{ stroke: 'var(--viz-grid)' }}
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 36 }}
            xAxisProps={{ minTickGap: 24 }}
            yAxisProps={{ width: 56, tickFormatter: (value: number) => formatNumber(value) }}
          />
        ) : (
          <Table.ScrollContainer minWidth={480} maxHeight={360}>
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
          <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
            <Text fw={650} fz="lg" px="md" py="md">
              By field
            </Text>
            <Table.ScrollContainer minWidth={640}>
              <Table
                verticalSpacing="sm"
                style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Field</Table.Th>
                    <Table.Th ta="right">Applied</Table.Th>
                    <Table.Th ta="right">Crop need</Table.Th>
                    <Table.Th ta="right">Need met</Table.Th>
                    <Table.Th ta="right">Calendar would use</Table.Th>
                    <Table.Th ta="right">Saved</Table.Th>
                    <Table.Th ta="right">Runs</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary.fields.map((field) => {
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
            </Table.ScrollContainer>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card withBorder h="100%">
            <Group gap={6} mb="md">
              <Text fw={650} fz="lg">
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
                    allocation.usedPct >= 90 ? 'red' : allocation.usedPct >= 75 ? 'orange' : 'teal';
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
