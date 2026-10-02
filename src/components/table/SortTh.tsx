import { Table, UnstyledButton, type TableThProps } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { SortDirection } from './useSort';

interface SortThProps extends Omit<TableThProps, 'children'> {
  sort: { direction: SortDirection | null; onSort: () => void };
  children: ReactNode;
}

/** A column header that sorts: ascending, descending, then back to the list's own order. */
export function SortTh({ sort, children, ...props }: SortThProps) {
  const Icon =
    sort.direction === 'asc'
      ? IconArrowUp
      : sort.direction === 'desc'
        ? IconArrowDown
        : IconArrowsSort;
  return (
    <Table.Th
      {...props}
      aria-sort={
        sort.direction === 'asc' ? 'ascending' : sort.direction === 'desc' ? 'descending' : 'none'
      }
    >
      <UnstyledButton
        className="app-sort"
        data-sorted={sort.direction != null || undefined}
        data-align={props.ta === 'right' ? 'right' : undefined}
        onClick={sort.onSort}
      >
        {children}
        <Icon size={13} stroke={2} aria-hidden />
      </UnstyledButton>
    </Table.Th>
  );
}
