import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconClipboardCheck,
  IconDots,
  IconPencil,
  IconTool,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryStates';
import { useFarm, useFields } from '@/features/farms/api';
import { useSyncCurrentFarm } from '@/features/farms/currentFarm';
import { useWorkOrders } from '@/features/maintenance/api';
import {
  WorkOrderFormModal,
  type WorkOrderDraft,
} from '@/features/maintenance/components/WorkOrderFormModal';
import { KIND, PRIORITY, STATUS as WO_STATUS } from '@/features/maintenance/presentation';
import { confirmDestructive } from '@/lib/confirm';
import {
  daysFromToday,
  formatClock,
  formatDate,
  formatDueIn,
  formatNumber,
  formatPercent,
  formatRelative,
  formatWhen,
  humanize,
} from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useAsset, useChangeAssetStatus, useConditionChecks, useDeleteAsset } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { AssetTrendChart } from '../components/AssetTrendChart';
import { ConditionCheckModal } from '../components/ConditionCheckModal';
import { HealthRing } from '../components/HealthRing';
import {
  ASSET_STATUS,
  ASSET_TYPE,
  CONDITION,
  CRITICALITY,
  FACTOR_SEVERITY,
  RISK,
  VIBRATION,
} from '../presentation';
import { ASSET_STATUSES, type Asset, type AssetStatus, type ConditionCheck } from '../types';

export function AssetDetailPage() {
  const { farmId = '', assetId = '' } = useParams();
  useSyncCurrentFarm(farmId);
  const navigate = useNavigate();
  const farm = useFarm(farmId);
  const detail = useAsset(farmId, assetId);
  const checks = useConditionChecks(farmId, assetId);
  const fields = useFields(farmId);
  const workOrders = useWorkOrders(farmId);
  const changeStatus = useChangeAssetStatus(farmId);
  const remove = useDeleteAsset(farmId);
  const [checkOpened, check] = useDisclosure(false);
  const [editOpened, edit] = useDisclosure(false);
  const [draft, setDraft] = useState<WorkOrderDraft | null>(null);

  if (detail.isPending) {
    return <LoadingState layout="page" label="Loading asset…" />;
  }
  if (detail.isError) {
    return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  }

  const { asset, children, parent } = detail.data;
  const health = asset.health;
  const TypeIcon = ASSET_TYPE[asset.type].icon;
  const field = fields.data?.find((candidate) => candidate.id === asset.fieldId);
  const assetOrders = (workOrders.data ?? [])
    .filter((order) => order.asset?.id === asset.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openOrders = assetOrders.filter((order) =>
    ['OPEN', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status),
  );
  const worst = health?.factors.find((factor) => factor.impact < 0 && factor.action);

  const setStatus = (status: AssetStatus) =>
    changeStatus.mutate(
      { assetId: asset.id, status },
      {
        onSuccess: () =>
          notifySuccess(`${asset.name} marked ${ASSET_STATUS[status].label.toLowerCase()}`),
        onError: (error) => notifyError(error, "Couldn't change the status"),
      },
    );

  const deleteAsset = () =>
    confirmDestructive({
      title: `Delete ${asset.name}?`,
      message:
        'Its condition checks are deleted too. Work orders keep their history. Mark it retired instead if it was replaced.',
      onConfirm: () =>
        remove.mutate(asset.id, {
          onSuccess: () => {
            notifySuccess(`${asset.name} deleted`);
            navigate('/infrastructure');
          },
          onError: (error) => notifyError(error, "Couldn't delete the asset"),
        }),
    });

  const createWorkOrder = () =>
    setDraft({
      assetId: asset.id,
      kind: health?.service?.overdue ? 'PREVENTIVE' : worst ? 'PREDICTIVE' : 'INSPECTION',
      priority:
        health?.risk === 'CRITICAL' ? 'URGENT' : health?.risk === 'HIGH' ? 'HIGH' : 'MEDIUM',
      title: worst ? `${worst.label}: ${asset.name}` : `Service ${asset.name}`,
      description: worst ? `${worst.detail}\n\n${worst.action ?? ''}`.trim() : '',
    });

  const subtitle = [
    ASSET_TYPE[asset.type].label,
    [asset.manufacturer, asset.model].filter(Boolean).join(' '),
    asset.installedOn ? `installed ${asset.installedOn.slice(0, 4)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <PageHeader
        back={{
          to: '/infrastructure',
          label: farm.data ? `${farm.data.name} infrastructure` : 'Infrastructure',
        }}
        title={
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" size={40} radius="md">
              <TypeIcon size={22} />
            </ThemeIcon>
            <span>{asset.name}</span>
            <Badge variant="dot" color={ASSET_STATUS[asset.status].color}>
              {ASSET_STATUS[asset.status].label}
            </Badge>
          </Group>
        }
        description={subtitle}
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconClipboardCheck size={16} />}
              onClick={check.open}
            >
              Condition check
            </Button>
            <Button leftSection={<IconTool size={16} />} onClick={createWorkOrder}>
              Work order
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label="More asset actions">
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPencil size={14} />} onClick={edit.open}>
                  Edit details
                </Menu.Item>
                <Menu.Label>Set status</Menu.Label>
                {ASSET_STATUSES.filter((status) => status !== asset.status).map((status) => (
                  <Menu.Item key={status} onClick={() => setStatus(status)}>
                    <Badge variant="dot" color={ASSET_STATUS[status].color} size="sm">
                      {ASSET_STATUS[status].label}
                    </Badge>
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={deleteAsset}>
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />

      {asset.status === 'DOWN' && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          mb="lg"
          title="Out of service"
        >
          {children.length > 0
            ? `Everything downstream (${children.map((child) => child.name).join(', ')}) is without water until this is repaired.`
            : 'Irrigation that depends on this asset cannot run until it is repaired.'}
        </Alert>
      )}

      {health && (
        <Grid gap="lg" mb="lg">
          <Grid.Col span={{ base: 12, md: 6, xl: 4 }}>
            <Card withBorder h="100%">
              <Group wrap="nowrap" align="flex-start">
                <HealthRing score={health.score} label="health" />
                <Stack gap={6} miw={0}>
                  <Badge color={RISK[health.risk].color} variant="dot" size="lg">
                    {RISK[health.risk].label}
                  </Badge>
                  <Text size="sm">{health.outlook}</Text>
                  {health.recommendedAction && (
                    <Text size="sm" fw={600}>
                      Next step: {health.recommendedAction}
                    </Text>
                  )}
                </Stack>
              </Group>
              <Text size="xs" c="dimmed" mt="md">
                Scored by transparent maintenance rules ({health.modelVersion}) from service
                history, condition checks and age. Sensor-trained models will refine it as telemetry
                arrives.
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, xl: 4 }}>
            <ServiceCard asset={asset} openOrders={openOrders.length} onBook={createWorkOrder} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, xl: 4 }}>
            <SpecsCard asset={asset} fieldName={field?.name} />
          </Grid.Col>
        </Grid>
      )}

      {health && health.factors.length > 0 && (
        <Card withBorder mb="lg">
          <Text fw={600} mb="sm">
            What is driving the score
          </Text>
          <Stack gap="sm">
            {health.factors.map((factor) => (
              <Group key={factor.code} wrap="nowrap" align="flex-start" gap="sm">
                <Badge
                  variant="light"
                  color={factor.impact < 0 ? FACTOR_SEVERITY[factor.severity].color : 'green'}
                  w={52}
                  style={{ flexShrink: 0 }}
                >
                  {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                </Badge>
                <Stack gap={0} miw={0}>
                  <Text size="sm" fw={600}>
                    {factor.label}
                    <Text span size="xs" c="dimmed" fw={400}>
                      {' '}
                      · {FACTOR_SEVERITY[factor.severity].label}
                    </Text>
                  </Text>
                  <Text size="sm" c="dimmed">
                    {factor.detail}
                  </Text>
                  {factor.action && factor.impact < 0 && <Text size="sm">{factor.action}</Text>}
                </Stack>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      <Stack gap="lg" mb="lg">
        <AssetTrendChart asset={asset} checks={checks.data ?? []} />
      </Stack>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg" mb="lg">
        <ChecksCard checks={checks.data ?? []} loading={checks.isPending} onAdd={check.open} />
        <Card withBorder padding={0} className="app-table-card">
          <Group justify="space-between" p="md" pb="xs">
            <Text fw={600}>Work orders</Text>
            <Anchor component={Link} to="/maintenance" size="sm">
              Maintenance board
            </Anchor>
          </Group>
          {assetOrders.length === 0 ? (
            <Text size="sm" c="dimmed" p="md" pt={0}>
              No work orders for this asset.
            </Text>
          ) : (
            <Table verticalSpacing="sm">
              <Table.Tbody>
                {assetOrders.slice(0, 8).map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {order.reference} · {order.title}
                      </Text>
                      <Group gap={6} mt={2}>
                        <Badge size="sm" variant="light" color={KIND[order.kind].color}>
                          {KIND[order.kind].label}
                        </Badge>
                        <Badge size="sm" variant="dot" color={PRIORITY[order.priority].color}>
                          {PRIORITY[order.priority].label}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="dot" color={WO_STATUS[order.status].color}>
                        {WO_STATUS[order.status].label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c={order.overdue ? 'red' : 'dimmed'}>
                        {order.completedAt
                          ? `Done ${formatRelative(order.completedAt)}`
                          : order.dueOn
                            ? `Due ${formatDueIn(order.dueOn)}`
                            : ''}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </SimpleGrid>

      {(parent || children.length > 0) && (
        <Card withBorder>
          <Title order={2} mb="sm">
            Water network
          </Title>
          <Stack gap="xs">
            {parent && (
              <Group gap="xs">
                <IconArrowUp size={16} />
                <Text size="sm" c="dimmed">
                  Fed by
                </Text>
                <Anchor component={Link} to={`/farms/${farmId}/assets/${parent.id}`} size="sm">
                  {parent.name}
                </Anchor>
                {parent.health && (
                  <Badge size="sm" variant="dot" color={RISK[parent.health.risk].color}>
                    {parent.health.score}
                  </Badge>
                )}
              </Group>
            )}
            {children.map((child) => (
              <Group gap="xs" key={child.id}>
                <IconArrowDown size={16} />
                <Text size="sm" c="dimmed">
                  Feeds
                </Text>
                <Anchor component={Link} to={`/farms/${farmId}/assets/${child.id}`} size="sm">
                  {child.name}
                </Anchor>
                {child.health && (
                  <Badge size="sm" variant="dot" color={RISK[child.health.risk].color}>
                    {child.health.score}
                  </Badge>
                )}
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      <ConditionCheckModal
        opened={checkOpened}
        onClose={check.close}
        farmId={farmId}
        asset={asset}
      />
      <AssetFormModal opened={editOpened} onClose={edit.close} farmId={farmId} asset={asset} />
      <WorkOrderFormModal
        opened={draft != null}
        onClose={() => setDraft(null)}
        farmId={farmId}
        draft={draft ?? undefined}
      />
    </>
  );
}

function ServiceCard({
  asset,
  openOrders,
  onBook,
}: {
  asset: Asset;
  openOrders: number;
  onBook: () => void;
}) {
  const service = asset.health?.service;
  if (!service) {
    return (
      <Card withBorder h="100%">
        <Text fw={600}>Service plan</Text>
        <Text size="sm" c="dimmed" mt="xs">
          No service interval set. Add one (days or run-hours) to get service forecasts and
          reminders.
        </Text>
      </Card>
    );
  }
  const color = service.overdue ? 'red' : service.progressPct >= 85 ? 'orange' : 'green';
  return (
    <Card withBorder h="100%">
      <Group justify="space-between">
        <Text fw={600}>Next service</Text>
        <Badge variant="dot" color={color}>
          {service.overdue ? 'Overdue' : service.progressPct >= 85 ? 'Due soon' : 'On plan'}
        </Badge>
      </Group>
      <Text
        fz={26}
        fw={600}
        lts={-0.5}
        mt="xs"
        c={service.overdue ? 'red' : undefined}
        className="app-num"
      >
        {!service.dueOn
          ? '—'
          : service.overdue
            ? `${-daysFromToday(service.dueOn)} days overdue`
            : formatDueIn(service.dueOn)}
      </Text>
      <Text size="sm" c="dimmed">
        {service.dueOn ? formatDate(service.dueOn) : ''}
        {service.basis === 'RUN_HOURS'
          ? ' · forecast from recent run-hours'
          : ' · calendar interval'}
      </Text>
      <Progress
        value={Math.min(100, service.progressPct)}
        color={color}
        size="md"
        mt="md"
        aria-label="Service interval used"
      />
      <Group justify="space-between" mt={6}>
        <Text size="xs" c="dimmed">
          {formatPercent(service.progressPct)} of interval used
        </Text>
        {service.runHoursRemaining != null && (
          <Text size="xs" c="dimmed">
            {formatNumber(service.runHoursRemaining)} run-hours left
          </Text>
        )}
      </Group>
      <Text size="xs" c="dimmed" mt="sm">
        Last serviced {asset.lastServiceOn ? formatDate(asset.lastServiceOn) : 'never recorded'}
        {asset.serviceIntervalDays ? ` · every ${asset.serviceIntervalDays} days` : ''}
        {asset.serviceIntervalHours ? ` or ${formatNumber(asset.serviceIntervalHours)} h` : ''}
      </Text>
      {(service.overdue || service.progressPct >= 85) && openOrders === 0 && (
        <Button
          size="xs"
          mt="md"
          variant="light"
          leftSection={<IconTool size={14} />}
          onClick={onBook}
        >
          Book the service
        </Button>
      )}
    </Card>
  );
}

function SpecsCard({ asset, fieldName }: { asset: Asset; fieldName?: string }) {
  const rows: [string, string][] = [];
  rows.push(['Criticality', CRITICALITY[asset.criticality].label]);
  if (asset.powerSource) rows.push(['Power', humanize(asset.powerSource)]);
  if (asset.ratedPowerKw != null)
    rows.push(['Rated power', `${formatNumber(asset.ratedPowerKw, 1)} kW`]);
  if (asset.ratedFlowM3h != null)
    rows.push(['Rated flow', `${formatNumber(asset.ratedFlowM3h, 1)} m³/h`]);
  if (asset.ratedHeadM != null) rows.push(['Rated head', `${formatNumber(asset.ratedHeadM)} m`]);
  if (asset.operatingWindowStart && asset.operatingWindowEnd)
    rows.push([
      'Runs',
      `${formatClock(asset.operatingWindowStart)}–${formatClock(asset.operatingWindowEnd)}`,
    ]);
  if (asset.health?.energyKwhPerM3 != null)
    rows.push([
      'Energy now',
      `${formatNumber(asset.health.energyKwhPerM3, 3)} kWh/m³${
        asset.health.energyDriftPct != null
          ? ` (${asset.health.energyDriftPct >= 0 ? '+' : ''}${formatNumber(asset.health.energyDriftPct)}%)`
          : ''
      }`,
    ]);
  if (asset.capacityM3 != null) rows.push(['Capacity', `${formatNumber(asset.capacityM3)} m³`]);
  if (asset.annualAllocationM3 != null)
    rows.push(['Allocation', `${formatNumber(asset.annualAllocationM3)} m³/yr`]);
  if (asset.operatingHours != null && asset.operatingHours > 0)
    rows.push(['Hour meter', `${formatNumber(asset.operatingHours)} h`]);
  if (asset.expectedLifeYears != null)
    rows.push(['Design life', `${asset.expectedLifeYears} years`]);
  if (fieldName) rows.push(['Serves', fieldName]);
  if (asset.serialNumber) rows.push(['Serial', asset.serialNumber]);

  return (
    <Card withBorder h="100%">
      <Text fw={600} mb="xs">
        Specification
      </Text>
      <Table verticalSpacing={4} withRowBorders={false}>
        <Table.Tbody>
          {rows.map(([label, value]) => (
            <Table.Tr key={label}>
              <Table.Td c="dimmed" fz="sm" pl={0} w="45%">
                {label}
              </Table.Td>
              <Table.Td fz="sm" fw={500}>
                {value}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {asset.notes && (
        <Text size="xs" c="dimmed" mt="sm">
          {asset.notes}
        </Text>
      )}
    </Card>
  );
}

function ChecksCard({
  checks,
  loading,
  onAdd,
}: {
  checks: ConditionCheck[];
  loading: boolean;
  onAdd: () => void;
}) {
  return (
    <Card withBorder padding={0} className="app-table-card">
      <Group justify="space-between" p="md" pb="xs">
        <Text fw={600}>Condition checks</Text>
        <Button
          size="compact-sm"
          variant="subtle"
          leftSection={<IconClipboardCheck size={14} />}
          onClick={onAdd}
        >
          Record
        </Button>
      </Group>
      {loading && <LoadingState />}
      {!loading && checks.length === 0 && (
        <Text size="sm" c="dimmed" p="md" pt={0}>
          No inspections yet. A monthly walk-round check (condition, flow, power, vibration, leaks)
          is what lets IrrigaIQ warn before a failure.
        </Text>
      )}
      {checks.length > 0 && (
        <Table.ScrollContainer
          minWidth={480}
          maxHeight={360}
          scrollAreaProps={{ viewportProps: { tabIndex: 0, 'aria-label': 'Scrollable table' } }}
        >
          <Table verticalSpacing="sm" stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Condition</Table.Th>
                <Table.Th>Readings</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {checks.slice(0, 20).map((check) => (
                <Table.Tr key={check.id}>
                  <Table.Td>
                    <Text size="sm">{formatWhen(check.checkedAt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="dot" color={CONDITION[check.overallCondition].color}>
                      {CONDITION[check.overallCondition].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{readings(check) || '—'}</Text>
                    {check.notes && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {check.notes}
                      </Text>
                    )}
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

function readings(check: ConditionCheck): string {
  return [
    check.flowM3h != null ? `${formatNumber(check.flowM3h, 1)} m³/h` : null,
    check.powerKw != null ? `${formatNumber(check.powerKw, 1)} kW` : null,
    check.energyKwhPerM3 != null ? `${formatNumber(check.energyKwhPerM3, 3)} kWh/m³` : null,
    check.pressureBar != null ? `${formatNumber(check.pressureBar, 1)} bar` : null,
    check.filterDpBar != null ? `ΔP ${formatNumber(check.filterDpBar, 2)} bar` : null,
    check.waterLevelM != null ? `level ${formatNumber(check.waterLevelM, 2)} m` : null,
    check.vibration && check.vibration !== 'NORMAL'
      ? `vibration ${VIBRATION[check.vibration].label.toLowerCase()}`
      : null,
    check.leakDetected ? 'leak found' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
