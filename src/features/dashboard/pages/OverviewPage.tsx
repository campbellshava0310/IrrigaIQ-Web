import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBolt,
  IconCalendarDue,
  IconChecks,
  IconDroplet,
  IconEngine,
  IconPigMoney,
  IconPlant2,
  IconSparkles,
  IconTool,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
import { useAuth } from '@/features/auth/useAuth';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { HealthRing } from '@/features/infrastructure/components/HealthRing';
import { ASSET_TYPE, RISK } from '@/features/infrastructure/presentation';
import { useBriefing } from '@/features/dashboard/api';
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
  formatNumber,
  formatPercent,
  formatVolume,
  formatWhen,
  humanize,
  toIsoDate,
} from '@/lib/format';

import { useDashboard } from '../api';
import { WeatherStrip } from '../components/WeatherStrip';
import type { Dashboard, Task, TaskKind } from '../types';

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const TASK_STYLE: Record<TaskKind, { icon: typeof IconDroplet; color: string; label: string }> = {
  IRRIGATE: { icon: IconDroplet, color: 'orange', label: 'Irrigation' },
  CONFIRM_IRRIGATION: { icon: IconChecks, color: 'blue', label: 'Confirm' },
  WORK_ORDER: { icon: IconTool, color: 'violet', label: 'Work order' },
  BOOK_SERVICE: { icon: IconCalendarDue, color: 'yellow', label: 'Service' },
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
            ? `${formatDayLabel(dashboard.data.today)} · ${dashboard.data.farmName}${
                dashboard.data.location ? `, ${dashboard.data.location}` : ''
              }`
            : farm.name
        }
        title={`${greeting()}, ${firstName}`}
        actions={
          <Button
            component={Link}
            to="/intelligence"
            variant="default"
            leftSection={<IconSparkles size={16} />}
          >
            Today&apos;s briefing
          </Button>
        }
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
  const briefing = useBriefing(farm.id);
  const actions = useIrrigationActions(farm.id);
  const today = new Date();
  const planned = useIrrigationEvents(farm.id, {
    from: toIsoDate(addDays(today, -7)),
    to: toIsoDate(addDays(today, 1)),
    status: 'PLANNED',
  });
  const [confirming, setConfirming] = useState<IrrigationEvent | null>(null);
  const [draft, setDraft] = useState<WorkOrderDraft | null>(null);

  const byStatus = data.fields.byStatus;
  const needNow = (byStatus.IRRIGATE_NOW ?? 0) + (byStatus.STRESSED ?? 0);
  const atRisk = (data.assets.byRisk.HIGH ?? 0) + (data.assets.byRisk.CRITICAL ?? 0);
  const openAlerts = data.alerts.open + data.alerts.acknowledged;

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

  const taskAction: Record<TaskKind, string> = {
    IRRIGATE: 'Plan it',
    CONFIRM_IRRIGATION: 'Confirm',
    WORK_ORDER: 'Open',
    BOOK_SERVICE: 'Book',
  };

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
    <Stack gap="lg">
      <Box className="app-hero" p={{ base: 'lg', sm: 28 }}>
        <Grid gap="xl" align="center">
          <Grid.Col span={{ base: 12, md: 7 }}>
            {next ? (
              <Stack gap={10} align="flex-start">
                <Group gap={8} wrap="nowrap">
                  <Text size="xs" fw={600} className="app-glass-pill">
                    Next up
                  </Text>
                  <Text size="sm" fw={500} opacity={0.8}>
                    {TASK_STYLE[next.kind].label}
                    {next.dueOn ? ` · due ${formatDueIn(next.dueOn)}` : ''}
                  </Text>
                </Group>
                <Title order={2} c="white" fz={{ base: 22, sm: 26 }} lts={-0.6} lh={1.2}>
                  {next.title}
                </Title>
                <Text size="sm" opacity={0.85} maw={560}>
                  {next.detail}
                </Text>
                <Button
                  variant="white"
                  color="brand.8"
                  mt={6}
                  loading={next.kind === 'IRRIGATE' && actions.planningFieldId === next.fieldId}
                  onClick={() => runTask(next)}
                  rightSection={<IconArrowRight size={16} />}
                >
                  {taskAction[next.kind]}
                </Button>
              </Stack>
            ) : (
              <Stack gap={10} align="flex-start">
                <Text size="xs" fw={600} className="app-glass-pill">
                  All clear
                </Text>
                <Title order={2} c="white" fz={{ base: 22, sm: 26 }} lts={-0.6} lh={1.2}>
                  Nothing needs doing today
                </Title>
                <Text size="sm" opacity={0.85} maw={560}>
                  Fields are watered and no equipment is due. New work appears here as soon as a
                  field dries down or an asset needs attention.
                </Text>
              </Stack>
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box className="app-glass" p="md">
              <Group gap={8} mb={6} wrap="nowrap">
                <IconSparkles size={16} />
                <Text size="xs" fw={600} opacity={0.85}>
                  Farm briefing
                </Text>
              </Group>
              <Text fw={600} lh={1.35}>
                {briefing.data?.headline ?? 'Reading the fields, weather and equipment…'}
              </Text>
              <Anchor
                component={Link}
                to="/intelligence"
                size="sm"
                c="white"
                mt={8}
                display="inline-block"
                underline="always"
              >
                Read the full briefing
              </Anchor>
            </Box>
          </Grid.Col>
        </Grid>
      </Box>

      <SimpleGrid type="container" cols={{ base: 2, '560px': 3, '1180px': 6 }} spacing="md">
        <StatCard
          label="Need water now"
          value={String(needNow)}
          hint={`${byStatus.IRRIGATE_SOON ?? 0} more within 2 days · ${data.fields.planted} planted`}
          icon={<IconDroplet size={16} />}
          color={needNow > 0 ? 'orange' : 'teal'}
          to="/irrigation"
        />
        <StatCard
          label="Water this week"
          value={formatVolume(data.water.weekAppliedM3)}
          hint={
            data.water.weekAdequacyPct != null
              ? `${formatPercent(data.water.weekAdequacyPct)} of crop need`
              : 'No crop demand this week'
          }
          icon={<IconDroplet size={16} />}
          color="blue"
          to="/water"
        />
        <StatCard
          label="Saved, 30 days"
          value={formatVolume(Math.max(0, data.water.monthSavedM3))}
          hint={
            data.water.monthSavedPct != null
              ? `${formatPercent(data.water.monthSavedPct)} vs calendar schedule`
              : 'vs calendar schedule'
          }
          icon={<IconPigMoney size={16} />}
          color="teal"
          to="/water"
        />
        <StatCard
          label="Energy this week"
          value={formatNumber(data.water.weekEnergyKwh)}
          unit="kWh"
          hint={
            data.water.weekEnergyCost != null
              ? `${formatMoney(data.water.weekEnergyCost, data.water.currency)} on grid`
              : 'Pumping energy'
          }
          icon={<IconBolt size={16} />}
          color="yellow"
          to="/water"
        />
        <StatCard
          label="Assets at risk"
          value={String(atRisk)}
          hint={`${data.assets.serviceOverdue} services overdue`}
          icon={<IconEngine size={16} />}
          color={atRisk > 0 ? 'red' : 'teal'}
          to="/infrastructure"
        />
        <StatCard
          label="Open alerts"
          value={String(openAlerts)}
          hint={`${data.alerts.critical} critical`}
          icon={<IconAlertTriangle size={16} />}
          color={data.alerts.critical > 0 ? 'red' : openAlerts > 0 ? 'orange' : 'teal'}
          to="/alerts"
        />
      </SimpleGrid>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="lg">
            {later.length > 0 && (
              <Card withBorder>
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <div>
                    <Title order={3} fz="lg">
                      Also today
                    </Title>
                    <Text size="sm" c="dimmed">
                      Water that protects yield first, then work that prevents breakdowns.
                    </Text>
                  </div>
                  <Badge variant="light" color="gray" className="app-num">
                    {later.length}
                  </Badge>
                </Group>
                <Stack gap={0}>
                  {later.map((task, index) => {
                    const style = TASK_STYLE[task.kind];
                    const planning =
                      task.kind === 'IRRIGATE' && actions.planningFieldId === task.fieldId;
                    return (
                      <Box key={`${task.kind}-${index}`}>
                        {index > 0 && <Divider color="var(--app-border)" ml={48} />}
                        <Group wrap="nowrap" gap="md" py={12}>
                          <ThemeIcon variant="light" color={style.color} radius="md" size={34}>
                            <style.icon size={18} />
                          </ThemeIcon>
                          <Stack gap={2} style={{ flex: 1 }} miw={0}>
                            <Text size="sm" fw={600} lineClamp={1}>
                              {task.title}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {task.detail}
                              {task.dueOn ? ` · due ${formatDueIn(task.dueOn)}` : ''}
                            </Text>
                          </Stack>
                          <Button
                            size="xs"
                            variant="default"
                            loading={planning}
                            onClick={() => runTask(task)}
                          >
                            {taskAction[task.kind]}
                          </Button>
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              </Card>
            )}
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3} fz="lg">
                  Fields
                </Title>
                <Anchor component={Link} to="/irrigation" size="sm">
                  Irrigation planner
                </Anchor>
              </Group>
              {data.fields.items.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No fields yet.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {data.fields.items.map((tile) => {
                    const decision = DECISION[tile.decision];
                    return (
                      <UnstyledButton
                        key={tile.fieldId}
                        className="app-tile"
                        onClick={() => navigate(`/farms/${farm.id}/fields/${tile.fieldId}`)}
                        aria-label={`Open ${tile.name}`}
                      >
                        <Group justify="space-between" wrap="nowrap" mb={6}>
                          <Stack gap={0} miw={0}>
                            <Text size="sm" fw={600} truncate>
                              {tile.name}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                              {tile.cropType ? humanize(tile.cropType) : 'No crop'}
                              {tile.phase ? ` · ${PHASE_LABEL[tile.phase]}` : ''}
                            </Text>
                          </Stack>
                          <Badge size="sm" variant="dot" color={WATER_STATUS[tile.status].color}>
                            {decision.label}
                          </Badge>
                        </Group>
                        <SoilWaterMeter
                          depletionPct={tile.depletionPct}
                          stressThresholdPct={tile.stressThresholdPct}
                          status={tile.status}
                          size="sm"
                        />
                        <Text size="xs" c="dimmed" mt={6}>
                          {tile.nextPlannedAt
                            ? `Planned ${formatWhen(tile.nextPlannedAt)}`
                            : tile.decision === 'IRRIGATE_NOW' || tile.decision === 'IRRIGATE_SOON'
                              ? `${formatVolume(tile.volumeM3)} · ${formatDuration(tile.durationMinutes)}${
                                  tile.startTime ? ` from ${formatClock(tile.startTime)}` : ''
                                }`
                              : tile.irrigateOn
                                ? `Next around ${formatDayLabel(tile.irrigateOn)}`
                                : ' '}
                          {tile.yieldAtRiskPct != null && tile.yieldAtRiskPct >= 1
                            ? ` · ${formatPercent(tile.yieldAtRiskPct)} yield lost`
                            : ''}
                        </Text>
                      </UnstyledButton>
                    );
                  })}
                </SimpleGrid>
              )}
            </Card>
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
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3} fz="lg">
                  Infrastructure watch
                </Title>
                <Anchor component={Link} to="/infrastructure" size="sm">
                  All {data.assets.total} assets
                </Anchor>
              </Group>
              {data.assets.attention.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {data.assets.total === 0
                    ? 'Add pumps, sources and filters to get service forecasts and early failure warnings.'
                    : 'Every asset is healthy and on its service plan.'}
                </Text>
              ) : (
                <Stack gap={2} mx={-8}>
                  {data.assets.attention.map((asset) => {
                    const Icon = ASSET_TYPE[asset.type].icon;
                    return (
                      <UnstyledButton
                        key={asset.assetId}
                        className="app-row"
                        onClick={() => navigate(`/farms/${farm.id}/assets/${asset.assetId}`)}
                        aria-label={`Open ${asset.name}`}
                      >
                        <Group wrap="nowrap" gap="sm">
                          <HealthRing score={asset.healthScore} size={46} />
                          <Stack gap={0} style={{ flex: 1 }} miw={0}>
                            <Group gap={6} wrap="nowrap">
                              <Icon size={14} />
                              <Text size="sm" fw={600} truncate>
                                {asset.name}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {asset.topFactor ?? RISK[asset.risk].description}
                            </Text>
                          </Stack>
                          <Stack gap={2} align="flex-end">
                            <Badge size="sm" variant="dot" color={RISK[asset.risk].color}>
                              {RISK[asset.risk].label}
                            </Badge>
                            {asset.nextServiceOn && (
                              <Text
                                size="xs"
                                c={daysFromToday(asset.nextServiceOn) < 0 ? 'red' : 'dimmed'}
                              >
                                {daysFromToday(asset.nextServiceOn) < 0
                                  ? `Service overdue ${-daysFromToday(asset.nextServiceOn)} d`
                                  : `Service ${formatDueIn(asset.nextServiceOn)}`}
                              </Text>
                            )}
                          </Stack>
                        </Group>
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              )}
              <Divider color="var(--app-border)" mt="md" mb="sm" />
              <Group gap="lg">
                <Text size="xs" c="dimmed">
                  Work orders: <b>{data.maintenance.open}</b> open ·{' '}
                  <b>{data.maintenance.inProgress}</b> in progress
                  {data.maintenance.overdue > 0 && (
                    <Text span c="red" size="xs">
                      {' '}
                      · {data.maintenance.overdue} overdue
                    </Text>
                  )}
                </Text>
              </Group>
            </Card>
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
