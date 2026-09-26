import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconCash,
  IconCheck,
  IconClockPause,
  IconDots,
  IconHeartbeat,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconRotate,
  IconSearch,
  IconTool,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { formatDate, formatDueIn, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useWorkOrders, useWorkOrderTransition } from '../api';
import { CompleteWorkOrderModal } from '../components/CompleteWorkOrderModal';
import { WorkOrderFormModal } from '../components/WorkOrderFormModal';
import { KIND, PRIORITY } from '../presentation';
import type { WorkOrder, WorkOrderKind } from '../types';

type Column = 'TODO' | 'IN_PROGRESS' | 'DONE';

const COLUMNS: { key: Column; title: string; description: string }[] = [
  { key: 'TODO', title: 'To do', description: 'Open and scheduled' },
  { key: 'IN_PROGRESS', title: 'In progress', description: 'Being worked on' },
  { key: 'DONE', title: 'Done', description: 'Last 30 days' },
];

function columnOf(order: WorkOrder): Column | null {
  switch (order.status) {
    case 'OPEN':
    case 'SCHEDULED':
      return 'TODO';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'DONE':
      return order.completedAt &&
        Date.now() - new Date(order.completedAt).getTime() < 30 * 86_400_000
        ? 'DONE'
        : null;
    default:
      return null;
  }
}

/** Urgent and overdue first, then by due date. */
function byUrgency(a: WorkOrder, b: WorkOrder): number {
  return (
    Number(b.overdue) - Number(a.overdue) ||
    PRIORITY[a.priority].rank - PRIORITY[b.priority].rank ||
    (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999')
  );
}

export function MaintenancePage() {
  return <RequireFarm>{(farm) => <MaintenanceBoard farm={farm} />}</RequireFarm>;
}

function MaintenanceBoard({ farm }: { farm: Farm }) {
  const orders = useWorkOrders(farm.id);
  const transition = useWorkOrderTransition(farm.id);
  const [kind, setKind] = useState<'ALL' | WorkOrderKind>('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<WorkOrder | 'new' | null>(null);
  const [completing, setCompleting] = useState<WorkOrder | null>(null);

  const all = useMemo(() => orders.data ?? [], [orders.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all.filter(
      (order) =>
        (kind === 'ALL' || order.kind === kind) &&
        (!query ||
          [order.reference, order.title, order.asset?.name, order.assignee]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query))),
    );
  }, [all, kind, search]);

  const active = all.filter((order) => ['OPEN', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status));
  const overdue = active.filter((order) => order.overdue).length;
  const predictive = active.filter(
    (order) => order.kind === 'PREDICTIVE' || order.kind === 'PREVENTIVE',
  ).length;
  const doneRecent = all.filter((order) => columnOf(order) === 'DONE');
  const spend = doneRecent.reduce((sum, order) => sum + (order.cost ?? 0), 0);
  const downtime = doneRecent.reduce((sum, order) => sum + (order.downtimeHours ?? 0), 0);

  const run = (action: 'start' | 'reopen', order: WorkOrder) =>
    transition.mutate(
      { action, id: order.id },
      {
        onSuccess: () =>
          notifySuccess(`${order.reference} ${action === 'start' ? 'started' : 'reopened'}`),
        onError: (error) => notifyError(error, `Couldn't ${action} ${order.reference}`),
      },
    );

  const cancel = (order: WorkOrder) =>
    modals.openConfirmModal({
      title: `Cancel ${order.reference}?`,
      centered: true,
      children: <Text size="sm">{order.title}. It stays in the history as cancelled.</Text>,
      labels: { confirm: 'Cancel work order', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        transition.mutate(
          { action: 'cancel', id: order.id, reason: null },
          {
            onSuccess: () => notifySuccess(`${order.reference} cancelled`),
            onError: (error) => notifyError(error, "Couldn't cancel the work order"),
          },
        ),
    });

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Preventive services, predictive jobs raised by health warnings, and repairs, from request to done. Completing a service restarts the asset's service clock."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing('new')}>
            New work order
          </Button>
        }
      />

      {orders.isPending && <LoadingState layout="page" label="Loading work orders…" />}
      {orders.isError && <ErrorState error={orders.error} onRetry={() => orders.refetch()} />}

      {orders.data && (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="xl">
            <StatCard
              label="Open jobs"
              value={formatNumber(active.length)}
              hint={`${overdue} overdue`}
              icon={<IconTool size={16} />}
              color={overdue ? 'red' : 'teal'}
            />
            <StatCard
              label="Planned & predictive"
              value={formatNumber(predictive)}
              hint="Caught before failure"
              icon={<IconHeartbeat size={16} />}
              color="violet"
            />
            <StatCard
              label="Spend, 30 days"
              value={formatMoney(spend, farm.currency)}
              hint={`${doneRecent.length} ${doneRecent.length === 1 ? 'job' : 'jobs'} completed`}
              icon={<IconCash size={16} />}
              color="blue"
            />
            <StatCard
              label="Irrigation downtime"
              value={formatNumber(downtime, 1)}
              unit="h"
              hint="From completed jobs, 30 days"
              icon={<IconClockPause size={16} />}
              color="gray"
            />
          </SimpleGrid>

          <Group mb="md" gap="sm">
            <TextInput
              placeholder="Search jobs, assets, people"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={260}
              aria-label="Search work orders"
            />
            <SegmentedControl
              value={kind}
              onChange={(value) => setKind(value as 'ALL' | WorkOrderKind)}
              data={[
                { value: 'ALL', label: 'All' },
                { value: 'PREVENTIVE', label: 'Preventive' },
                { value: 'PREDICTIVE', label: 'Predictive' },
                { value: 'CORRECTIVE', label: 'Repairs' },
                { value: 'INSPECTION', label: 'Inspections' },
              ]}
            />
          </Group>

          {all.length === 0 ? (
            <EmptyState
              icon={<IconTool size={24} />}
              title="No work orders yet"
              description="Create one here, from an asset, or in one click from an infrastructure alert."
            />
          ) : (
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              {COLUMNS.map((column) => {
                const items = filtered
                  .filter((order) => columnOf(order) === column.key)
                  .sort(byUrgency);
                return (
                  <Box key={column.key} p="sm" className="app-lane">
                    <Group justify="space-between" mb="sm" px={4} wrap="nowrap">
                      <div>
                        <Title order={3} fz="sm">
                          {column.title}
                        </Title>
                        <Text size="xs" c="dimmed">
                          {column.description}
                        </Text>
                      </div>
                      <Badge variant="light" color="gray" className="app-num">
                        {items.length}
                      </Badge>
                    </Group>
                    <ScrollArea.Autosize mah="70vh" type="auto">
                      <Stack gap="sm">
                        {items.length === 0 && (
                          <Text size="sm" c="dimmed" ta="center" py="lg">
                            Nothing here
                          </Text>
                        )}
                        {items.map((order) => (
                          <WorkOrderCard
                            key={order.id}
                            order={order}
                            farmId={farm.id}
                            currency={farm.currency}
                            onStart={() => run('start', order)}
                            onComplete={() => setCompleting(order)}
                            onReopen={() => run('reopen', order)}
                            onEdit={() => setEditing(order)}
                            onCancel={() => cancel(order)}
                          />
                        ))}
                      </Stack>
                    </ScrollArea.Autosize>
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
        </>
      )}

      <WorkOrderFormModal
        opened={editing != null}
        onClose={() => setEditing(null)}
        farmId={farm.id}
        workOrder={editing && editing !== 'new' ? editing : undefined}
      />
      <CompleteWorkOrderModal
        workOrder={completing}
        onClose={() => setCompleting(null)}
        farmId={farm.id}
        currency={farm.currency}
      />
    </>
  );
}

interface WorkOrderCardProps {
  order: WorkOrder;
  farmId: string;
  currency: string;
  onStart: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

function WorkOrderCard({
  order,
  farmId,
  currency,
  onStart,
  onComplete,
  onReopen,
  onEdit,
  onCancel,
}: WorkOrderCardProps) {
  const done = order.status === 'DONE';
  return (
    <Card withBorder padding="sm">
      <Group justify="space-between" wrap="nowrap" gap="xs" mb={6}>
        <Group gap={6}>
          <Text size="xs" fw={600} c="dimmed" className="app-num">
            {order.reference}
          </Text>
          <Badge size="sm" variant="light" color={KIND[order.kind].color}>
            {KIND[order.kind].label}
          </Badge>
          {!done && (
            <Badge size="sm" variant="dot" color={PRIORITY[order.priority].color}>
              {PRIORITY[order.priority].label}
            </Badge>
          )}
        </Group>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              aria-label={`Actions for ${order.reference}`}
            >
              <IconDots size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {!done && (
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={onEdit}>
                Edit
              </Menu.Item>
            )}
            {done ? (
              <Menu.Item leftSection={<IconRotate size={14} />} onClick={onReopen}>
                Reopen
              </Menu.Item>
            ) : (
              <Menu.Item color="red" leftSection={<IconX size={14} />} onClick={onCancel}>
                Cancel
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Text size="sm" fw={600} lh={1.3}>
        {order.title}
      </Text>
      {order.asset && (
        <Anchor component={Link} to={`/farms/${farmId}/assets/${order.asset.id}`} size="xs">
          {order.asset.name}
        </Anchor>
      )}
      {order.description && !done && (
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {order.description}
        </Text>
      )}
      {done && (order.completionNotes || order.cost != null) && (
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {[order.completionNotes, order.cost != null ? formatMoney(order.cost, currency) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}
      <Group justify="space-between" mt="xs" gap="xs">
        <Text size="xs" c={order.overdue ? 'red' : 'dimmed'} fw={order.overdue ? 600 : undefined}>
          {done
            ? `Done ${formatRelative(order.completedAt)}`
            : order.dueOn
              ? `${order.overdue ? 'Overdue · ' : 'Due '}${formatDueIn(order.dueOn)} (${formatDate(order.dueOn)})`
              : 'No due date'}
          {order.assignee ? ` · ${order.assignee}` : ''}
        </Text>
        {order.status === 'IN_PROGRESS' ? (
          <Button size="compact-xs" leftSection={<IconCheck size={12} />} onClick={onComplete}>
            Complete
          </Button>
        ) : !done ? (
          <Group gap={4}>
            <Button
              size="compact-xs"
              variant="default"
              leftSection={<IconPlayerPlay size={12} />}
              onClick={onStart}
            >
              Start
            </Button>
            <Button size="compact-xs" variant="subtle" onClick={onComplete}>
              Done
            </Button>
          </Group>
        ) : null}
      </Group>
    </Card>
  );
}
