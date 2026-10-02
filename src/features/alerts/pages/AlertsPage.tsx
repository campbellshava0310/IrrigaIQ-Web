import { Anchor, Badge, Button, Card, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import {
  IconBellCheck,
  IconCalendarPlus,
  IconCheck,
  IconEye,
  IconRefresh,
  IconTool,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { FilterBar, FilterMenu } from '@/components/filters/FilterBar';
import { sameFilters, type SavedView } from '@/components/filters/savedViews';
import { SavedViewsMenu } from '@/components/filters/SavedViewsMenu';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { useIrrigationActions } from '@/features/irrigation/useIrrigationActions';
import { formatDuration, formatNumber, formatRelative, formatVolume } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useAlertAction, useAlerts, useAlertWorkOrder, useEvaluateAlerts } from '../api';
import { ALERT_TYPE, SEVERITY, STATE } from '../presentation';
import type { Alert, AlertSeverity, AlertType } from '../types';

const IRRIGATION_TYPES: AlertType[] = [
  'IRRIGATION_REQUIRED',
  'CROP_WATER_STRESS',
  'RAIN_EXPECTED',
  'WATER_ALLOCATION',
  'WATER_ANOMALY',
];

type Area = 'IRRIGATION' | 'INFRASTRUCTURE';

interface AlertFilters {
  status: 'active' | 'resolved';
  area: Area | null;
  severity: AlertSeverity | null;
}

const DEFAULT_FILTERS: AlertFilters = { status: 'active', area: null, severity: null };

const PRESETS: SavedView<AlertFilters>[] = [
  { id: 'needs-action', name: 'Needs action', filters: DEFAULT_FILTERS },
  {
    id: 'critical',
    name: 'Critical only',
    filters: { status: 'active', area: null, severity: 'CRITICAL' },
  },
  {
    id: 'equipment',
    name: 'Equipment',
    filters: { status: 'active', area: 'INFRASTRUCTURE', severity: null },
  },
  { id: 'resolved', name: 'Resolved', filters: { status: 'resolved', area: null, severity: null } },
];

export function AlertsPage() {
  return <RequireFarm>{(farm) => <AlertsInbox farm={farm} />}</RequireFarm>;
}

function AlertsInbox({ farm }: { farm: Farm }) {
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_FILTERS);
  const { area, severity } = filters;
  const history = filters.status === 'resolved';
  const alerts = useAlerts(farm.id, history);
  const evaluate = useEvaluateAlerts(farm.id);

  const list = useMemo(() => alerts.data ?? [], [alerts.data]);
  const visible = useMemo(
    () =>
      list
        .filter((alert) => (history ? alert.state === 'RESOLVED' : alert.state !== 'RESOLVED'))
        .filter((alert) => severity == null || alert.severity === severity)
        .filter((alert) =>
          area == null
            ? true
            : area === 'IRRIGATION'
              ? IRRIGATION_TYPES.includes(alert.type)
              : !IRRIGATION_TYPES.includes(alert.type),
        )
        .sort(
          (a, b) =>
            (history ? 0 : SEVERITY[a.severity].rank - SEVERITY[b.severity].rank) ||
            Number(a.state === 'ACKNOWLEDGED') - Number(b.state === 'ACKNOWLEDGED') ||
            (b.resolvedAt ?? b.updatedAt).localeCompare(a.resolvedAt ?? a.updatedAt),
        ),
    [list, history, severity, area],
  );
  const active = list.filter((alert) => alert.state !== 'RESOLVED');
  const count = (value: AlertSeverity) => active.filter((alert) => alert.severity === value).length;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Raised and cleared automatically as conditions change."
        help="Alerts fire when a field needs water, heavy rain is coming or equipment shows signs of failure, and clear when the condition goes away. Checked every 15 minutes and after every change."
        actions={
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            loading={evaluate.isPending}
            onClick={() =>
              evaluate.mutate(undefined, {
                onSuccess: () => notifySuccess('Alerts are up to date'),
                onError: (error) => notifyError(error, "Couldn't re-check alerts"),
              })
            }
          >
            Re-check now
          </Button>
        }
      />

      <FilterBar
        onReset={
          sameFilters(filters, DEFAULT_FILTERS) ? undefined : () => setFilters(DEFAULT_FILTERS)
        }
        end={
          <Text size="sm" c="dimmed" className="app-num">
            {visible.length} {visible.length === 1 ? 'alert' : 'alerts'}
          </Text>
        }
      >
        <FilterMenu
          label="Status"
          value={filters.status}
          options={[
            { value: 'active', label: `Active (${active.length})` },
            { value: 'resolved', label: 'Resolved' },
          ]}
          onChange={(status) => status && setFilters({ ...filters, status, severity: null })}
        />
        <FilterMenu
          label="Area"
          allLabel="All"
          value={area}
          options={[
            { value: 'IRRIGATION', label: 'Irrigation' },
            { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
          ]}
          onChange={(value) => setFilters({ ...filters, area: value })}
        />
        {!history && (
          <FilterMenu
            label="Severity"
            allLabel="All"
            value={severity}
            options={[
              { value: 'CRITICAL', label: `Critical (${count('CRITICAL')})` },
              { value: 'WARNING', label: `Warning (${count('WARNING')})` },
              { value: 'INFO', label: `Info (${count('INFO')})` },
            ]}
            onChange={(value) => setFilters({ ...filters, severity: value })}
          />
        )}
        <SavedViewsMenu
          storageKey="alerts"
          presets={PRESETS}
          current={filters}
          onApply={setFilters}
        />
      </FilterBar>

      {alerts.isPending && <LoadingState label="Loading alerts…" />}
      {alerts.isError && <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />}
      {alerts.data && visible.length === 0 && (
        <EmptyState
          icon={<IconBellCheck size={24} />}
          color={history ? 'brand' : 'green'}
          title={history ? 'No resolved alerts yet' : 'All clear'}
          description={
            history
              ? 'Alerts you resolve, and those that clear on their own, are kept here.'
              : 'No field needs urgent water and no asset is showing warning signs right now.'
          }
        />
      )}
      <Stack gap="sm">
        {visible.map((alert) => (
          <AlertCard key={alert.id} alert={alert} farmId={farm.id} />
        ))}
      </Stack>
    </>
  );
}

function AlertCard({ alert, farmId }: { alert: Alert; farmId: string }) {
  const action = useAlertAction(farmId);
  const workOrder = useAlertWorkOrder(farmId);
  const irrigation = useIrrigationActions(farmId);
  const severity = SEVERITY[alert.severity];
  const resolved = alert.state === 'RESOLVED';

  const act = (kind: 'acknowledge' | 'resolve') =>
    action.mutate(
      { id: alert.id, action: kind },
      {
        onSuccess: () =>
          notifySuccess(
            kind === 'acknowledge'
              ? 'Acknowledged. It stays open until the condition clears.'
              : 'Resolved. The same alert will not be raised again for 24 hours.',
          ),
        onError: (error) => notifyError(error, `Couldn't ${kind} the alert`),
      },
    );

  return (
    <Card withBorder padding="md" style={{ opacity: resolved ? 0.8 : 1 }}>
      <Group align="flex-start" wrap="nowrap" gap="md">
        <ThemeIcon color={resolved ? 'gray' : severity.color} variant="light" size={36} radius="md">
          <severity.icon size={20} />
        </ThemeIcon>
        <Stack gap={4} style={{ flex: 1 }} miw={0}>
          <Group justify="space-between" wrap="wrap" align="flex-start" gap="xs">
            <Text fw={600} style={{ flex: '1 1 260px' }}>
              {alert.title}
            </Text>
            <Group gap={6} wrap="nowrap">
              <Badge variant="light" color={resolved ? 'gray' : severity.color} size="sm">
                {severity.label}
              </Badge>
              <Badge variant="dot" color={STATE[alert.state].color} size="sm">
                {STATE[alert.state].label}
              </Badge>
            </Group>
          </Group>
          <Text size="sm" c="dimmed">
            {alert.message}
          </Text>
          <DetailLine alert={alert} />
          <Group gap="xs" mt={4}>
            <Text size="xs" c="dimmed">
              {ALERT_TYPE[alert.type]} · raised {formatRelative(alert.createdAt)}
              {alert.updatedAt !== alert.createdAt && !resolved
                ? ` · updated ${formatRelative(alert.updatedAt)}`
                : ''}
              {resolved &&
                ` · ${alert.autoResolved ? 'cleared on its own' : 'resolved'} ${formatRelative(alert.resolvedAt)}`}
            </Text>
            {alert.fieldId && alert.fieldName && (
              <Anchor component={Link} to={`/farms/${farmId}/fields/${alert.fieldId}`} size="xs">
                {alert.fieldName}
              </Anchor>
            )}
            {alert.assetId && alert.assetName && (
              <Anchor component={Link} to={`/farms/${farmId}/assets/${alert.assetId}`} size="xs">
                {alert.assetName}
              </Anchor>
            )}
          </Group>
          {!resolved && (
            <Group gap="xs" mt="xs">
              {(alert.type === 'IRRIGATION_REQUIRED' || alert.type === 'CROP_WATER_STRESS') &&
                alert.fieldId && (
                  <Button
                    size="xs"
                    leftSection={<IconCalendarPlus size={14} />}
                    loading={irrigation.planningFieldId === alert.fieldId}
                    onClick={() => alert.fieldId && irrigation.planRecommended(alert.fieldId)}
                  >
                    Plan irrigation
                  </Button>
                )}
              {alert.assetId &&
                (alert.workOrderId ? (
                  <Button
                    size="xs"
                    variant="default"
                    component={Link}
                    to="/maintenance"
                    leftSection={<IconTool size={14} />}
                  >
                    View work order
                  </Button>
                ) : (
                  <Tooltip label="Creates a prioritised work order with the diagnosis and acknowledges this alert">
                    <Button
                      size="xs"
                      leftSection={<IconTool size={14} />}
                      loading={workOrder.isPending}
                      onClick={() =>
                        workOrder.mutate(alert.id, {
                          onSuccess: (link) =>
                            notifySuccess(
                              `${link.reference} created for ${alert.assetName ?? 'the asset'}`,
                            ),
                          onError: (error) => notifyError(error, "Couldn't create the work order"),
                        })
                      }
                    >
                      Create work order
                    </Button>
                  </Tooltip>
                ))}
              {alert.state === 'OPEN' && (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconEye size={14} />}
                  loading={action.isPending}
                  onClick={() => act('acknowledge')}
                >
                  Acknowledge
                </Button>
              )}
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                leftSection={<IconCheck size={14} />}
                onClick={() => act('resolve')}
              >
                Resolve
              </Button>
            </Group>
          )}
        </Stack>
      </Group>
    </Card>
  );
}

/** A few key numbers from the alert's details, when the rule attached them. */
function DetailLine({ alert }: { alert: Alert }) {
  const details = alert.details ?? {};
  const number = (key: string) =>
    typeof details[key] === 'number' ? (details[key] as number) : null;
  const parts: string[] = [];
  const volume = number('volumeM3');
  const duration = number('durationMinutes');
  const health = number('healthScore');
  const used = number('usedPct');
  const rain = number('expectedRainMm');
  if (volume != null) parts.push(`Apply ${formatVolume(volume)}`);
  if (duration != null) parts.push(`run ${formatDuration(duration)}`);
  if (health != null) parts.push(`health ${health}/100`);
  if (used != null) parts.push(`${formatNumber(used)}% of allocation used`);
  if (rain != null) parts.push(`${formatNumber(rain)} mm expected`);
  if (parts.length === 0) {
    return null;
  }
  return (
    <Text size="xs" fw={600} className="app-num">
      {sentence(parts.join(' · '))}
    </Text>
  );
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
