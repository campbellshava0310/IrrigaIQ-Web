import {
  Badge,
  Card,
  Code,
  Group,
  Pagination,
  Popover,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useState } from 'react';

import { FilterBar, FilterMenu } from '@/components/filters/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryStates';
import { formatDateTime, formatRelative, humanize } from '@/lib/format';
import { describeUserAgent } from '@/lib/userAgent';

import { useAuditEvents } from '../api';
import { AUDIT_ACTIONS, type AuditAction, type AuditEvent } from '../types';

type OutcomeFilter = 'ALL' | 'SUCCESS' | 'FAILURE';

function Details({ event }: { event: AuditEvent }) {
  if (!event.details || Object.keys(event.details).length === 0) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }
  const summary = Object.entries(event.details)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? '…' : String(value)}`)
    .join(', ');
  return (
    <Popover width={360} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton>
          <Text size="xs" c="dimmed" lineClamp={1} maw={220}>
            {summary}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Code block>{JSON.stringify(event.details, null, 2)}</Code>
        {event.requestId && (
          <Text size="xs" c="dimmed" mt="xs">
            Request {event.requestId}
          </Text>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

export function AdminAuditPage() {
  const [action, setAction] = useState<AuditAction | null>(null);
  const [outcome, setOutcome] = useState<OutcomeFilter>('ALL');
  const [page, setPage] = useState(1);
  const events = useAuditEvents({
    action,
    outcome: outcome === 'ALL' ? null : outcome,
    page: page - 1,
  });

  return (
    <>
      <PageHeader
        back={{ to: '/admin', label: 'Administration' }}
        title="Audit log"
        description="Append-only record of security-relevant activity. Newest first."
      />
      <FilterBar
        onReset={
          action == null && outcome === 'ALL'
            ? undefined
            : () => {
                setAction(null);
                setOutcome('ALL');
                setPage(1);
              }
        }
      >
        <FilterMenu
          label="Action"
          allLabel="All"
          value={action}
          options={AUDIT_ACTIONS.map((value) => ({ value, label: humanize(value) }))}
          onChange={(value) => {
            setAction(value);
            setPage(1);
          }}
        />
        <FilterMenu
          label="Outcome"
          allLabel="All"
          value={outcome === 'ALL' ? null : outcome}
          options={[
            { value: 'SUCCESS', label: 'Success' },
            { value: 'FAILURE', label: 'Failure' },
          ]}
          onChange={(value) => {
            setOutcome(value ?? 'ALL');
            setPage(1);
          }}
        />
      </FilterBar>
      <Card withBorder padding={0} className="app-table-card">
        {events.isPending && <LoadingState label="Loading audit events…" />}
        {events.isError && <ErrorState error={events.error} onRetry={() => events.refetch()} />}
        {events.data && (
          <>
            <div className="app-table-scroll">
              <Table stickyHeader miw={900} verticalSpacing="xs" striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>When</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th>Outcome</Table.Th>
                    <Table.Th>Actor</Table.Th>
                    <Table.Th>Target</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Details</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {events.data.content.map((event) => (
                    <Table.Tr key={event.id}>
                      <Table.Td>
                        <Tooltip label={formatDateTime(event.occurredAt)}>
                          <Text size="sm">{formatRelative(event.occurredAt)}</Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {humanize(event.action)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="dot"
                          color={event.outcome === 'SUCCESS' ? 'green' : 'red'}
                        >
                          {humanize(event.outcome)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{event.actorEmail ?? '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {event.targetType
                            ? `${humanize(event.targetType)} ${event.targetId?.slice(0, 8) ?? ''}`
                            : '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label={event.userAgent ?? 'Unknown'} multiline maw={360}>
                          <Text size="xs" c="dimmed">
                            {event.ipAddress ?? '—'} · {describeUserAgent(event.userAgent)}
                          </Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Details event={event} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {events.data.content.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text c="dimmed" ta="center" py="md">
                          No audit events match these filters.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
            <Group justify="space-between" p="md">
              <Text size="sm" c="dimmed">
                {events.data.totalElements} events
              </Text>
              {events.data.totalPages > 1 && (
                <Pagination
                  total={events.data.totalPages}
                  value={page}
                  onChange={setPage}
                  size="sm"
                />
              )}
            </Group>
          </>
        )}
      </Card>
    </>
  );
}
