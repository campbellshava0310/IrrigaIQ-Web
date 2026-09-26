import { ActionIcon, Badge, Button, Group, Menu, Table, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconDots, IconHandStop, IconTrash } from '@tabler/icons-react';

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

  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>When</Table.Th>
            {showField && <Table.Th>Field</Table.Th>}
            <Table.Th>Status</Table.Th>
            <Table.Th ta="right">Run time</Table.Th>
            <Table.Th ta="right">Depth</Table.Th>
            <Table.Th ta="right">Volume</Table.Th>
            <Table.Th ta="right">Energy</Table.Th>
            <Table.Th>Notes</Table.Th>
            {actionable && <Table.Th w={140} />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {events.map((event) => (
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
                      {onSkip && (
                        <Tooltip label="Skip">
                          <ActionIcon
                            size="sm"
                            variant="default"
                            aria-label="Skip"
                            onClick={() => onSkip(event)}
                          >
                            <IconHandStop size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {onDelete && <DeleteMenu event={event} onDelete={onDelete} />}
                    </Group>
                  ) : (
                    onDelete && (
                      <Group justify="flex-end">
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
              <Table.Th colSpan={actionable ? 2 : 1} />
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </Table.ScrollContainer>
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
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label="More actions">
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
