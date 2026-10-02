import { ActionIcon, Badge, Button, Group, Menu, Table, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconDots, IconHandStop, IconTrash } from '@tabler/icons-react';

import { SortTh } from '@/components/table/SortTh';
import { useSort } from '@/components/table/useSort';
import { formatDepth, formatDuration, formatNumber, formatVolume, formatWhen } from '@/lib/format';

import { EVENT_SOURCE, EVENT_STATUS } from '../presentation';
import type { IrrigationEvent } from '../types';

interface EventsTableProps {
  events: IrrigationEvent[];
  showField?: boolean;
  onConfirm?: (event: IrrigationEvent) => void;
  onSkip?: (event: IrrigationEvent) => void;
  onDelete?: (event: IrrigationEvent) => void;
}

export function EventsTable({
  events,
  showField = true,
  onConfirm,
  onSkip,
  onDelete,
}: EventsTableProps) {
  const completed = events.filter((event) => event.status === 'COMPLETED');
  const totalVolume = completed.reduce((sum, event) => sum + event.volumeM3, 0);
  const totalEnergy = completed.reduce((sum, event) => sum + (event.energyKwh ?? 0), 0);
  const actionable = Boolean(onConfirm || onSkip || onDelete);
  const { sorted, header } = useSort(events, {
    when: (event) => event.startedAt,
    field: (event) => event.fieldName,
    status: (event) => (event.overdue ? 'Not confirmed' : EVENT_STATUS[event.status].label),
    duration: (event) => event.durationMinutes,
    depth: (event) => event.grossDepthMm,
    volume: (event) => event.volumeM3,
    energy: (event) => event.energyKwh,
  });

  return (
    <div className="app-table-scroll">
      <Table highlightOnHover stickyHeader miw={760}>
        <Table.Thead>
          <Table.Tr>
            <SortTh sort={header('when')}>When</SortTh>
            {showField && <SortTh sort={header('field')}>Field</SortTh>}
            <SortTh sort={header('status')}>Status</SortTh>
            <SortTh sort={header('duration')} ta="right">
              Run time
            </SortTh>
            <SortTh sort={header('depth')} ta="right">
              Depth
            </SortTh>
            <SortTh sort={header('volume')} ta="right">
              Volume
            </SortTh>
            <SortTh sort={header('energy')} ta="right">
              Energy
            </SortTh>
            <Table.Th>Notes</Table.Th>
            {actionable && (
              <Table.Th w={140}>
                <span className="app-visually-hidden">Actions</span>
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {sorted.map((event) => (
            <Table.Tr key={event.id}>
              <Table.Td>
                <Text size="sm">{formatWhen(event.startedAt)}</Text>
                <Text size="xs" c="dimmed">
                  {EVENT_SOURCE[event.source]}
                </Text>
              </Table.Td>
              {showField && <Table.Td>{event.fieldName}</Table.Td>}
              <Table.Td>
                <Badge
                  variant="dot"
                  color={event.overdue ? 'orange' : EVENT_STATUS[event.status].color}
                >
                  {event.overdue ? 'Not confirmed' : EVENT_STATUS[event.status].label}
                </Badge>
              </Table.Td>
              <Table.Td ta="right">{formatDuration(event.durationMinutes)}</Table.Td>
              <Table.Td ta="right">{formatDepth(event.grossDepthMm)}</Table.Td>
              <Table.Td ta="right">{formatVolume(event.volumeM3)}</Table.Td>
              <Table.Td ta="right">
                {event.energyKwh != null ? `${formatNumber(event.energyKwh)} kWh` : '—'}
              </Table.Td>
              <Table.Td miw={180} maw={260} style={{ whiteSpace: 'normal' }}>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {event.notes ?? ''}
                </Text>
              </Table.Td>
              {actionable && (
                <Table.Td>
                  {event.status === 'PLANNED' ? (
                    <Group gap={6} wrap="nowrap" justify="flex-end">
                      {onConfirm && (
                        <Button
                          size="compact-xs"
                          leftSection={<IconCheck size={12} />}
                          onClick={() => onConfirm(event)}
                        >
                          Done
                        </Button>
                      )}
                      <Group gap={6} wrap="nowrap" className="app-row-action">
                        {onSkip && (
                          <Tooltip label="Skip this run">
                            <ActionIcon
                              size="sm"
                              variant="default"
                              aria-label={`Skip the run planned ${formatWhen(event.startedAt)}`}
                              onClick={() => onSkip(event)}
                            >
                              <IconHandStop size={12} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {onDelete && <DeleteMenu event={event} onDelete={onDelete} />}
                      </Group>
                    </Group>
                  ) : (
                    onDelete && (
                      <Group justify="flex-end" className="app-row-action">
                        <DeleteMenu event={event} onDelete={onDelete} />
                      </Group>
                    )
                  )}
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
        {completed.length > 1 && (
          <Table.Tfoot>
            <Table.Tr>
              <Table.Th colSpan={showField ? 5 : 4}>
                {completed.length} completed irrigations
              </Table.Th>
              <Table.Th ta="right">{formatVolume(totalVolume)}</Table.Th>
              <Table.Th ta="right">
                {totalEnergy > 0 ? `${formatNumber(totalEnergy)} kWh` : '—'}
              </Table.Th>
              <Table.Td colSpan={actionable ? 2 : 1} />
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </div>
  );
}

function DeleteMenu({
  event,
  onDelete,
}: {
  event: IrrigationEvent;
  onDelete: (event: IrrigationEvent) => void;
}) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          aria-label={`More actions for the run on ${formatWhen(event.startedAt)}`}
        >
          <IconDots size={14} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={() => onDelete(event)}
        >
          Delete record
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
