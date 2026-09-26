import {
  Badge,
  Button,
  Card,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import {
  IconBolt,
  IconCalendarEvent,
  IconCalendarPlus,
  IconCircleCheck,
  IconClock,
  IconDroplet,
  IconHistory,
  IconLayoutGrid,
  IconPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { addDays, formatMoney, formatNumber, formatVolume, toIsoDate } from '@/lib/format';

import { useIrrigationEvents, useIrrigationStatus } from '../api';
import { CompleteIrrigationModal } from '../components/CompleteIrrigationModal';
import { EventsTable } from '../components/EventsTable';
import { FieldRecommendationCard } from '../components/FieldRecommendationCard';
import { IrrigationSetupModal } from '../components/IrrigationSetupModal';
import { LogIrrigationModal } from '../components/LogIrrigationModal';
import { SoilCheckModal } from '../components/SoilCheckModal';
import type { FieldStatus, IrrigationEvent, WaterStatus } from '../types';
import { useIrrigationActions } from '../useIrrigationActions';

/** Most urgent first, so the list reads as a to-do list. */
const URGENCY: Record<WaterStatus, number> = {
  STRESSED: 0,
  IRRIGATE_NOW: 1,
  IRRIGATE_SOON: 2,
  ADEQUATE: 3,
  SEASON_ENDED: 4,
  NOT_PLANTED: 5,
};

type Filter = 'ALL' | 'NEEDS_WATER' | 'OK';

export function IrrigationPage() {
  return <RequireFarm>{(farm) => <IrrigationWorkspace farm={farm} />}</RequireFarm>;
}

function IrrigationWorkspace({ farm }: { farm: Farm }) {
  const status = useIrrigationStatus(farm.id);
  const actions = useIrrigationActions(farm.id);
  const [tab, setTab] = useState<string | null>('fields');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [logTarget, setLogTarget] = useState<{
    fieldId?: string;
    mode: 'COMPLETED' | 'PLANNED';
  } | null>(null);
  const [soilTarget, setSoilTarget] = useState<FieldStatus | null>(null);
  const [setupTarget, setSetupTarget] = useState<FieldStatus | null>(null);
  const [confirming, setConfirming] = useState<IrrigationEvent | null>(null);

  const fields = useMemo(
    () =>
      [...(status.data ?? [])].sort(
        (a, b) =>
          URGENCY[a.recommendation.status] - URGENCY[b.recommendation.status] ||
          a.fieldName.localeCompare(b.fieldName),
      ),
    [status.data],
  );
  const needsWater = fields.filter((field) =>
    ['IRRIGATE_NOW', 'IRRIGATE_SOON'].includes(field.recommendation.decision),
  );
  const visible = fields.filter((field) =>
    filter === 'ALL'
      ? true
      : filter === 'NEEDS_WATER'
        ? needsWater.includes(field)
        : !needsWater.includes(field),
  );
  const todayVolume = fields
    .filter((field) => field.recommendation.decision === 'IRRIGATE_NOW')
    .reduce((sum, field) => sum + field.recommendation.volumeM3, 0);
  const todayCost = fields
    .filter((field) => field.recommendation.decision === 'IRRIGATE_NOW')
    .reduce((sum, field) => sum + (field.recommendation.energyCost ?? 0), 0);
  const fieldOptions = fields.map((field) => ({ id: field.fieldId, name: field.fieldName }));

  return (
    <>
      <PageHeader
        title="Irrigation"
        description="What each field needs today, from a daily soil water balance driven by the forecast, crop stage and soil, and calibrated by your soil checks."
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconCalendarPlus size={16} />}
              onClick={() => setLogTarget({ mode: 'PLANNED' })}
              disabled={fields.length === 0}
            >
              Plan
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setLogTarget({ mode: 'COMPLETED' })}
              disabled={fields.length === 0}
            >
              Log irrigation
            </Button>
          </>
        }
      />

      {status.isPending && <LoadingState layout="page" label="Running the water balance…" />}
      {status.isError && <ErrorState error={status.error} onRetry={() => status.refetch()} />}

      {status.data && fields.length === 0 && (
        <EmptyState
          icon={<IconDroplet size={24} />}
          title="No fields yet"
          description="Add fields to this farm with their soil type, then plant a crop to get daily irrigation recommendations."
        />
      )}

      {fields.length > 0 && (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="xl">
            <StatCard
              label="Need water today"
              value={String(
                fields.filter((f) => f.recommendation.decision === 'IRRIGATE_NOW').length,
              )}
              hint={todayVolume > 0 ? `${formatVolume(todayVolume)} in total` : 'Nothing urgent'}
              icon={<IconDroplet size={16} />}
              color="orange"
            />
            <StatCard
              label="Within 2 days"
              value={String(
                fields.filter((f) => f.recommendation.decision === 'IRRIGATE_SOON').length,
              )}
              hint="Plan ahead of the stress point"
              icon={<IconClock size={16} />}
              color="yellow"
            />
            <StatCard
              label="On track"
              value={String(
                fields.filter((f) =>
                  ['ON_TRACK', 'SCHEDULED', 'HOLD_FOR_RAIN'].includes(f.recommendation.decision),
                ).length,
              )}
              hint="Includes scheduled runs and rain holds"
              icon={<IconCircleCheck size={16} />}
              color="teal"
            />
            <StatCard
              label="Energy for today's runs"
              value={todayCost > 0 ? formatMoney(todayCost, farm.currency) : '—'}
              hint={
                farm.electricityTariff != null
                  ? `At ${formatMoney(farm.electricityTariff, farm.currency)}/kWh; solar is free`
                  : 'Set a tariff on the farm to cost runs'
              }
              icon={<IconBolt size={16} />}
              color="yellow"
            />
          </SimpleGrid>

          <Tabs value={tab} onChange={setTab} keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab
                value="fields"
                leftSection={<IconLayoutGrid size={16} />}
                rightSection={
                  needsWater.length > 0 ? (
                    <Badge
                      size="sm"
                      variant="light"
                      color="orange"
                      px={6}
                      aria-label={`${needsWater.length} need water`}
                    >
                      {needsWater.length}
                    </Badge>
                  ) : undefined
                }
              >
                Fields
              </Tabs.Tab>
              <Tabs.Tab value="schedule" leftSection={<IconCalendarEvent size={16} />}>
                Schedule
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
                History
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="fields">
              <Group justify="space-between" mb="md">
                <SegmentedControl
                  value={filter}
                  onChange={(value) => setFilter(value as Filter)}
                  data={[
                    { value: 'ALL', label: `All (${fields.length})` },
                    { value: 'NEEDS_WATER', label: `Needs water (${needsWater.length})` },
                    { value: 'OK', label: `Fine (${fields.length - needsWater.length})` },
                  ]}
                />
                {status.isFetching && (
                  <Text size="xs" c="dimmed">
                    Updating…
                  </Text>
                )}
              </Group>
              {visible.length === 0 ? (
                <EmptyState
                  icon={<IconDroplet size={24} />}
                  title="Nothing in this view"
                  description="No field matches this filter right now."
                />
              ) : (
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                  {visible.map((field) => (
                    <FieldRecommendationCard
                      key={field.fieldId}
                      farmId={farm.id}
                      field={field}
                      planning={actions.planningFieldId === field.fieldId}
                      onPlan={(target) => actions.planRecommended(target.fieldId)}
                      onLog={(target) =>
                        setLogTarget({ fieldId: target.fieldId, mode: 'COMPLETED' })
                      }
                      onSoilCheck={setSoilTarget}
                      onSetup={setSetupTarget}
                      onConfirm={setConfirming}
                      onSkip={actions.skipEvent}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="schedule">
              <ScheduleTab
                farmId={farm.id}
                onConfirm={setConfirming}
                onSkip={actions.skipEvent}
                onDelete={actions.deleteEvent}
              />
            </Tabs.Panel>

            <Tabs.Panel value="history">
              <HistoryTab farmId={farm.id} fields={fieldOptions} onDelete={actions.deleteEvent} />
            </Tabs.Panel>
          </Tabs>
        </>
      )}

      <LogIrrigationModal
        opened={logTarget != null}
        onClose={() => setLogTarget(null)}
        farmId={farm.id}
        fields={fieldOptions}
        fieldId={logTarget?.fieldId}
        mode={logTarget?.mode}
      />
      <SoilCheckModal
        opened={soilTarget != null}
        onClose={() => setSoilTarget(null)}
        farmId={farm.id}
        fieldId={soilTarget?.fieldId ?? ''}
        fieldName={soilTarget?.fieldName ?? ''}
      />
      <IrrigationSetupModal
        opened={setupTarget != null}
        onClose={() => setSetupTarget(null)}
        farmId={farm.id}
        fieldId={setupTarget?.fieldId ?? ''}
        fieldName={setupTarget?.fieldName ?? ''}
      />
      <CompleteIrrigationModal
        event={confirming}
        onClose={() => setConfirming(null)}
        farmId={farm.id}
      />
    </>
  );
}

function ScheduleTab({
  farmId,
  onConfirm,
  onSkip,
  onDelete,
}: {
  farmId: string;
  onConfirm: (event: IrrigationEvent) => void;
  onSkip: (event: IrrigationEvent) => void;
  onDelete: (event: IrrigationEvent) => void;
}) {
  const today = new Date();
  const events = useIrrigationEvents(farmId, {
    from: toIsoDate(addDays(today, -7)),
    to: toIsoDate(addDays(today, 14)),
    status: 'PLANNED',
  });
  if (events.isPending) return <LoadingState />;
  if (events.isError) return <ErrorState error={events.error} onRetry={() => events.refetch()} />;
  const planned = [...events.data].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const overdue = planned.filter((event) => event.overdue);
  if (planned.length === 0) {
    return (
      <EmptyState
        icon={<IconCalendarEvent size={24} />}
        title="Nothing scheduled"
        description="Plan a recommended irrigation from a field card and it will appear here, ready to confirm when it has run."
      />
    );
  }
  return (
    <Stack>
      {overdue.length > 0 && (
        <Text size="sm" c="orange.8">
          {overdue.length} planned {overdue.length === 1 ? 'run has' : 'runs have'} started without
          being confirmed. Confirm or skip {overdue.length === 1 ? 'it' : 'them'} so the water
          balance stays true.
        </Text>
      )}
      <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
        <EventsTable events={planned} onConfirm={onConfirm} onSkip={onSkip} onDelete={onDelete} />
      </Card>
      <Text size="xs" c="dimmed">
        Totals: {formatVolume(planned.reduce((sum, event) => sum + event.volumeM3, 0))} across{' '}
        {formatNumber(planned.length)} planned runs.
      </Text>
    </Stack>
  );
}

function HistoryTab({
  farmId,
  fields,
  onDelete,
}: {
  farmId: string;
  fields: { id: string; name: string }[];
  onDelete: (event: IrrigationEvent) => void;
}) {
  const [days, setDays] = useState('30');
  const [fieldId, setFieldId] = useState<string | null>(null);
  const today = new Date();
  const events = useIrrigationEvents(farmId, {
    from: toIsoDate(addDays(today, -Number(days) + 1)),
    to: toIsoDate(today),
    fieldId: fieldId ?? undefined,
  });
  const history = (events.data ?? [])
    .filter((event) => event.status !== 'PLANNED')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <Stack>
      <Group>
        <SegmentedControl
          value={days}
          onChange={setDays}
          data={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
          ]}
        />
        <Select
          placeholder="All fields"
          data={fields.map((field) => ({ value: field.id, label: field.name }))}
          value={fieldId}
          onChange={setFieldId}
          clearable
          w={220}
          aria-label="Filter by field"
        />
      </Group>
      {events.isPending && <LoadingState />}
      {events.isError && <ErrorState error={events.error} onRetry={() => events.refetch()} />}
      {events.data && history.length === 0 && (
        <EmptyState
          icon={<IconHistory size={24} />}
          title="No irrigation in this period"
          description="Completed and skipped irrigations appear here."
        />
      )}
      {history.length > 0 && (
        <Card
          withBorder
          padding={0}
          style={{ overflow: 'hidden', opacity: events.isPlaceholderData ? 0.6 : 1 }}
        >
          <EventsTable events={history} showField={!fieldId} onDelete={onDelete} />
        </Card>
      )}
    </Stack>
  );
}
