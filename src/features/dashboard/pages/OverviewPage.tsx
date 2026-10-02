import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCalendarDue,
  IconChecks,
  IconChevronRight,
  IconDroplet,
  IconPlant2,
  IconSparkles,
  IconTool,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Delta } from '@/components/Delta';
import { Metric, MetricStrip } from '@/components/MetricStrip';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { TrendLine } from '@/components/TrendLine';
import { useAuth } from '@/features/auth/useAuth';
import { useBriefing } from '@/features/dashboard/api';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { RISK, scoreColor } from '@/features/infrastructure/presentation';
import { useIrrigationEvents } from '@/features/irrigation/api';
import { CompleteIrrigationModal } from '@/features/irrigation/components/CompleteIrrigationModal';
import { SoilWaterMeter } from '@/features/irrigation/components/SoilWaterMeter';
import { DECISION, PHASE_LABEL, WATER_STATUS } from '@/features/irrigation/presentation';
import type { IrrigationEvent } from '@/features/irrigation/types';
import { useIrrigationActions } from '@/features/irrigation/useIrrigationActions';
import {
  WorkOrderFormModal,
  type WorkOrderDraft,
} from '@/features/maintenance/components/WorkOrderFormModal';
import {
  addDays,
  daysFromToday,
  formatClock,
  formatDayLabel,
  formatDueIn,
  formatDuration,
  formatMoney,
  formatPercent,
  formatVolume,
  formatWhen,
  humanize,
  toIsoDate,
} from '@/lib/format';

import { useDashboard } from '../api';
import { WeatherStrip } from '../components/WeatherStrip';
import type { Dashboard, FieldTile, Task, TaskKind } from '../types';

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const TASK: Record<TaskKind, { icon: typeof IconDroplet; label: string; action: string }> = {
  IRRIGATE: { icon: IconDroplet, label: 'Irrigation', action: 'Plan it' },
  CONFIRM_IRRIGATION: { icon: IconChecks, label: 'Confirm run', action: 'Confirm' },
  WORK_ORDER: { icon: IconTool, label: 'Work order', action: 'Open' },
  BOOK_SERVICE: { icon: IconCalendarDue, label: 'Service', action: 'Book' },
};

export function OverviewPage() {
  return <RequireFarm>{(farm) => <CommandCentre farm={farm} />}</RequireFarm>;
}

function CommandCentre({ farm }: { farm: Farm }) {
  const { user } = useAuth();
  const dashboard = useDashboard(farm.id);
  const firstName = user?.fullName.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        eyebrow={
          dashboard.data
            ? `${formatDayLabel(dashboard.data.today)} · ${dashboard.data.farmName}`
            : farm.name
        }
        title={`${greeting()}, ${firstName}`}
      />
      {dashboard.isPending && <LoadingState layout="page" label="Preparing today's plan…" />}
      {dashboard.isError && (
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      )}
      {dashboard.data && <DashboardBody data={dashboard.data} farm={farm} />}
    </>
  );
}

function DashboardBody({ data, farm }: { data: Dashboard; farm: Farm }) {
  const navigate = useNavigate();
  const actions = useIrrigationActions(farm.id);
  const today = new Date();
  const planned = useIrrigationEvents(farm.id, {
    from: toIsoDate(addDays(today, -7)),
    to: toIsoDate(addDays(today, 1)),
    status: 'PLANNED',
  });
  const [confirming, setConfirming] = useState<IrrigationEvent | null>(null);
  const [draft, setDraft] = useState<WorkOrderDraft | null>(null);

  const runTask = (task: Task) => {
    switch (task.kind) {
      case 'IRRIGATE':
        if (task.fieldId) actions.planRecommended(task.fieldId);
        break;
      case 'CONFIRM_IRRIGATION': {
        const event = planned.data?.find((candidate) => candidate.id === task.irrigationEventId);
        if (event) setConfirming(event);
        else navigate('/irrigation');
        break;
      }
      case 'WORK_ORDER':
        navigate('/maintenance');
        break;
      case 'BOOK_SERVICE': {
        const asset = data.assets.attention.find((tile) => tile.assetId === task.assetId);
        setDraft({
          assetId: task.assetId,
          kind: 'PREVENTIVE',
          priority:
            asset && (asset.risk === 'HIGH' || asset.risk === 'CRITICAL') ? 'HIGH' : 'MEDIUM',
          title: asset ? `Service ${asset.name}` : task.title,
          description: task.detail,
          dueOn: toIsoDate(addDays(today, 3)),
        });
        break;
      }
    }
  };
  const busy = (task: Task) =>
    task.kind === 'IRRIGATE' &&
    actions.planningFieldId != null &&
    actions.planningFieldId === task.fieldId;

  if (data.fields.total === 0 && data.assets.total === 0) {
    return (
      <EmptyState
        icon={<IconPlant2 size={24} />}
        title={`Let's set up ${data.farmName}`}
        description="Add your fields (with soil type and crop) and your water infrastructure (sources, pumps, filters). The overview then shows what to irrigate today and what to fix before it fails."
        action={
          <Group>
            <Button component={Link} to={`/farms/${farm.id}`}>
              Add fields
            </Button>
            <Button component={Link} to="/infrastructure" variant="default">
              Add infrastructure
            </Button>
          </Group>
        }
      />
    );
  }

  const [next, ...later] = data.tasks;

  return (
    <Stack gap="lg" className="app-fade-in">
      <FocusCard farmId={farm.id} next={next} busy={next ? busy(next) : false} onRun={runTask} />
      <Metrics data={data} />

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="lg">
            {later.length > 0 && <TaskList tasks={later} busy={busy} onRun={runTask} />}
            <FieldsCard farmId={farm.id} fields={data.fields.items} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <Card withBorder>
              <WeatherStrip
                days={data.forecast}
                today={data.today}
                live={data.weatherLive}
                layout="list"
              />
            </Card>
            <InfrastructureCard farmId={farm.id} data={data} />
          </Stack>
        </Grid.Col>
      </Grid>

      <CompleteIrrigationModal
        event={confirming}
        onClose={() => setConfirming(null)}
        farmId={farm.id}
      />
      <WorkOrderFormModal
        opened={draft != null}
        onClose={() => setDraft(null)}
        farmId={farm.id}
        draft={draft ?? undefined}
      />
    </Stack>
  );
}

/** The one message: what the farm needs today in a sentence, and the next thing to do about it. */
function FocusCard({
  farmId,
  next,
  busy,
  onRun,
}: {
  farmId: string;
  next: Task | undefined;
  busy: boolean;
  onRun: (task: Task) => void;
}) {
  const briefing = useBriefing(farmId);
  const style = next ? TASK[next.kind] : null;
  return (
    <Card withBorder padding={0}>
      <Box className="app-ai-wash" px={{ base: 'lg', sm: 28 }} py={{ base: 'lg', sm: 24 }}>
        <Group justify="space-between" mb={10} wrap="nowrap">
          <Group gap={6} wrap="nowrap" className="app-ai-label">
            <IconSparkles size={14} />
            AI insight
          </Group>
          <Anchor component={Link} to="/intelligence" size="sm">
            Full briefing
          </Anchor>
        </Group>
        {briefing.data ? (
          <Title order={2} fz={{ base: 20, sm: 24 }} fw={600} lts={-0.4} lh={1.3} maw={820}>
            {briefing.data.headline}
          </Title>
        ) : (
          <Skeleton h={26} w="70%" radius="sm" aria-label="Loading the briefing" />
        )}
      </Box>
      <Divider color="var(--app-border)" />
      <Group
        component="section"
        aria-label="Next up"
        px={{ base: 'lg', sm: 28 }}
        py={16}
        justify="space-between"
        gap="md"
        wrap="wrap"
      >
        {next && style ? (
          <>
            <Group gap="md" wrap="nowrap" miw={0} style={{ flex: '1 1 320px' }}>
              <Badge variant="light" color="brand" size="sm">
                Next up
              </Badge>
              <Box miw={0}>
                <Text fw={600} truncate>
                  {next.title}
                </Text>
                <Text size="sm" c="dimmed" truncate>
                  {style.label} · {next.detail}
                  {next.dueOn ? ` · due ${formatDueIn(next.dueOn)}` : ''}
                </Text>
              </Box>
            </Group>
            <Button
              loading={busy}
              onClick={() => onRun(next)}
              rightSection={<IconArrowRight size={16} />}
            >
              {style.action}
            </Button>
          </>
        ) : (
          <Group gap="sm">
            <Badge variant="dot" color="green" size="sm">
              All clear
            </Badge>
            <Text size="sm" c="dimmed">
              Fields are watered and no equipment is due.
            </Text>
          </Group>
        )}
      </Group>
    </Card>
  );
}

function Metrics({ data }: { data: Dashboard }) {
  const { water, fields, assets } = data;
  // An older API without the daily series (mid-deploy) shows the numbers without trend lines.
  const daily = water.daily ?? [];
  const needNow = (fields.byStatus.IRRIGATE_NOW ?? 0) + (fields.byStatus.STRESSED ?? 0);
  const atRisk = (assets.byRisk.HIGH ?? 0) + (assets.byRisk.CRITICAL ?? 0);
  return (
    <MetricStrip label="Key numbers">
      <Metric
        label="Water applied, 7 days"
        value={water.weekAppliedM3}
        unit="m³"
        delta={
          <Delta
            current={water.weekAppliedM3}
            previous={water.previousWeekAppliedM3}
            period="prior 7 days"
          />
        }
        hint={
          water.weekAdequacyPct != null
            ? `${formatPercent(water.weekAdequacyPct)} of crop need`
            : 'No crop demand this week'
        }
        trend={
          <TrendLine
            values={daily.map((day) => day.appliedM3)}
            color="var(--viz-water)"
            variant="bars"
            label="Water applied per day, last 30 days"
          />
        }
        to="/water"
      />
      <Metric
        label="Saved, 30 days"
        value={Math.max(0, water.monthSavedM3)}
        unit="m³"
        delta={
          <Delta
            current={water.monthSavedM3}
            previous={water.previousMonthSavedM3}
            good="up"
            period="prior 30 days"
          />
        }
        hint={
          water.monthSavedPct != null
            ? `${formatPercent(water.monthSavedPct)} less than a calendar schedule`
            : 'Against a calendar schedule'
        }
        to="/water"
      />
      <Metric
        label="Pumping energy, 7 days"
        value={water.weekEnergyKwh}
        unit="kWh"
        delta={
          <Delta
            current={water.weekEnergyKwh}
            previous={water.previousWeekEnergyKwh}
            good="down"
            period="prior 7 days"
          />
        }
        hint={
          water.weekEnergyCost != null
            ? `${formatMoney(water.weekEnergyCost, water.currency)} on grid power`
            : 'Solar or no tariff set'
        }
        trend={
          <TrendLine
            values={daily.map((day) => day.energyKwh)}
            color="var(--viz-equipment)"
            variant="bars"
            label="Pumping energy per day, last 30 days"
          />
        }
        to="/water"
      />
      <Metric
        label="Fields to water"
        value={needNow}
        tone={needNow > 0 ? 'serious' : 'good'}
        hint={`${fields.byStatus.IRRIGATE_SOON ?? 0} more within 2 days · ${fields.planted} planted`}
        to="/irrigation"
      />
      <Metric
        label="Assets at risk"
        value={atRisk}
        tone={atRisk > 0 ? 'critical' : 'good'}
        hint={`${assets.serviceOverdue} ${assets.serviceOverdue === 1 ? 'service' : 'services'} overdue`}
        to="/infrastructure"
      />
    </MetricStrip>
  );
}

function TaskList({
  tasks,
  busy,
  onRun,
}: {
  tasks: Task[];
  busy: (task: Task) => boolean;
  onRun: (task: Task) => void;
}) {
  return (
    <Card withBorder padding={0}>
      <Group justify="space-between" px="lg" pt="lg" pb="xs">
        <Title order={2}>Also today</Title>
        <Text size="sm" c="dimmed" className="app-num">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </Text>
      </Group>
      <Stack gap={0} pb={6}>
        {tasks.map((task, index) => {
          const style = TASK[task.kind];
          const overdue = task.dueOn != null && daysFromToday(task.dueOn) < 0;
          return (
            <Group
              key={`${task.kind}-${index}`}
              wrap="nowrap"
              gap="md"
              px="lg"
              py={10}
              className="app-list-row"
            >
              <style.icon size={18} stroke={1.7} color="var(--app-text-muted)" aria-hidden />
              <Box style={{ flex: 1 }} miw={0}>
                <Text size="sm" fw={500} truncate>
                  {task.title}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {style.label} · {task.detail}
                </Text>
              </Box>
              {task.dueOn && (
                <Text
                  size="xs"
                  c={overdue ? 'red' : 'dimmed'}
                  fw={overdue ? 600 : undefined}
                  className="app-num"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {overdue ? `${-daysFromToday(task.dueOn)} d overdue` : formatDueIn(task.dueOn)}
                </Text>
              )}
              <Button
                size="xs"
                variant="default"
                loading={busy(task)}
                onClick={() => onRun(task)}
                className="app-row-action"
                aria-label={`${style.action}: ${task.title}`}
              >
                {style.action}
              </Button>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}

function nextStep(tile: FieldTile): string {
  if (tile.nextPlannedAt) return `Planned ${formatWhen(tile.nextPlannedAt)}`;
  if (tile.decision === 'IRRIGATE_NOW' || tile.decision === 'IRRIGATE_SOON') {
    return `${formatVolume(tile.volumeM3)} · ${formatDuration(tile.durationMinutes)}${
      tile.startTime ? ` from ${formatClock(tile.startTime)}` : ''
    }`;
  }
  if (tile.irrigateOn) return `Next around ${formatDayLabel(tile.irrigateOn)}`;
  return '—';
}

function FieldsCard({ farmId, fields }: { farmId: string; fields: FieldTile[] }) {
  const navigate = useNavigate();
  return (
    <Card withBorder padding={0} className="app-table-card">
      <Group justify="space-between" px="lg" pt="lg" pb="sm">
        <Title order={2}>Fields</Title>
        <Anchor component={Link} to="/irrigation" size="sm">
          Irrigation planner
        </Anchor>
      </Group>
      {fields.length === 0 ? (
        <Text size="sm" c="dimmed" px="lg" pb="lg">
          No fields yet.
        </Text>
      ) : (
        <div className="app-table-scroll">
          <Table highlightOnHover miw={620} verticalSpacing={10}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Field</Table.Th>
                <Table.Th w={130}>Soil water</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Next</Table.Th>
                <Table.Th w={36}>
                  <span className="app-visually-hidden">Open</span>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fields.map((tile) => (
                <Table.Tr
                  key={tile.fieldId}
                  onClick={() => navigate(`/farms/${farmId}/fields/${tile.fieldId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/farms/${farmId}/fields/${tile.fieldId}`}
                      c="var(--mantine-color-text)"
                      fw={600}
                      size="sm"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {tile.name}
                    </Anchor>
                    <Text size="xs" c="dimmed" truncate>
                      {tile.cropType ? humanize(tile.cropType) : 'No crop'}
                      {tile.phase ? ` · ${PHASE_LABEL[tile.phase]}` : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <SoilWaterMeter
                      depletionPct={tile.depletionPct}
                      stressThresholdPct={tile.stressThresholdPct}
                      status={tile.status}
                      size="sm"
                      showLabels={false}
                    />
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    <Badge size="sm" variant="dot" color={WATER_STATUS[tile.status].color}>
                      {DECISION[tile.decision].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" className="app-num">
                      {nextStep(tile)}
                    </Text>
                    {tile.yieldAtRiskPct != null && tile.yieldAtRiskPct >= 1 && (
                      <Text size="xs" c="orange">
                        {formatPercent(tile.yieldAtRiskPct)} yield lost so far
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <IconChevronRight size={16} color="var(--app-text-muted)" aria-hidden />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function InfrastructureCard({ farmId, data }: { farmId: string; data: Dashboard }) {
  const navigate = useNavigate();
  const { assets, maintenance } = data;
  return (
    <Card withBorder padding={0}>
      <Group justify="space-between" px="lg" pt="lg" pb="xs">
        <Title order={2}>Infrastructure watch</Title>
        <Anchor component={Link} to="/infrastructure" size="sm">
          All {assets.total}
        </Anchor>
      </Group>
      {assets.attention.length === 0 ? (
        <Text size="sm" c="dimmed" px="lg" pb="md">
          {assets.total === 0
            ? 'Add pumps, sources and filters to get service forecasts and early failure warnings.'
            : 'Every asset is healthy and on its service plan.'}
        </Text>
      ) : (
        <Stack gap={0}>
          {assets.attention.map((asset) => {
            const days = asset.nextServiceOn ? daysFromToday(asset.nextServiceOn) : null;
            return (
              <UnstyledButton
                key={asset.assetId}
                display="block"
                w="100%"
                className="app-list-row"
                px="lg"
                py={10}
                onClick={() => navigate(`/farms/${farmId}/assets/${asset.assetId}`)}
                aria-label={`${asset.name}: health ${asset.healthScore}, ${RISK[asset.risk].label}`}
              >
                <Group wrap="nowrap" gap="md">
                  <Text
                    fw={600}
                    fz="lg"
                    w={32}
                    ta="right"
                    c={scoreColor(asset.healthScore)}
                    className="app-num"
                  >
                    {asset.healthScore}
                  </Text>
                  <Box style={{ flex: 1 }} miw={0}>
                    <Text size="sm" fw={500} truncate>
                      {asset.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {asset.topFactor ?? RISK[asset.risk].description}
                    </Text>
                  </Box>
                  {days != null && (
                    <Text
                      size="xs"
                      c={days < 0 ? 'red' : 'dimmed'}
                      fw={days < 0 ? 600 : undefined}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {days < 0
                        ? `Service ${-days} d overdue`
                        : `Service ${formatDueIn(asset.nextServiceOn)}`}
                    </Text>
                  )}
                </Group>
              </UnstyledButton>
            );
          })}
        </Stack>
      )}
      <Divider color="var(--app-border)" />
      <Text size="xs" c="dimmed" px="lg" py="sm">
        Work orders: <b>{maintenance.open}</b> open · <b>{maintenance.inProgress}</b> in progress
        {maintenance.overdue > 0 && (
          <Text span c="red" size="xs">
            {' '}
            · {maintenance.overdue} overdue
          </Text>
        )}
      </Text>
    </Card>
  );
}
