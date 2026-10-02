import { MantineProvider, Table } from '@mantine/core';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AuthShell } from '@/app/layouts/AuthLayout';
import { theme } from '@/app/theme';
import { LoginPage } from '@/features/auth/pages/LoginPage';

import { Delta } from './Delta';
import { FilterBar, FilterMenu } from './filters/FilterBar';
import { SavedViewsMenu } from './filters/SavedViewsMenu';
import { Metric, MetricStrip } from './MetricStrip';
import { PageHeader } from './PageHeader';
import { EmptyState, ErrorState } from './QueryStates';
import { SortTh } from './table/SortTh';
import { TrendLine } from './TrendLine';

/**
 * Structural accessibility of the shared building blocks: names, roles, labels, heading and list
 * semantics. Colour contrast needs a real browser, so it is audited there (docs/accessibility.md).
 */
async function violations(ui: ReactNode) {
  const router = createMemoryRouter([{ path: '/', element: ui }]);
  const { container } = render(
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe('shared components are accessible', () => {
  it('sign-in screen', async () => {
    expect(
      await violations(
        <AuthShell>
          <LoginPage />
        </AuthShell>,
      ),
    ).toEqual([]);
  });

  it('page header, metrics, trend and change', async () => {
    expect(
      await violations(
        <main>
          <PageHeader title="Water" description="One line." help="How it works." />
          <MetricStrip label="Key numbers">
            <Metric
              label="Applied"
              value={120}
              unit="m³"
              delta={<Delta current={120} previous={100} period="prior 7 days" />}
              trend={<TrendLine values={[1, 3, 2, 5]} color="teal" label="Applied per day" />}
              to="/water"
            />
            <Metric label="Assets at risk" value={2} tone="critical" hint="1 service overdue" />
          </MetricStrip>
        </main>,
      ),
    ).toEqual([]);
  });

  it('filter bar with menus and saved views', async () => {
    const filters = { status: 'active' as 'active' | 'resolved' };
    expect(
      await violations(
        <FilterBar
          search={{ value: '', onChange: () => {}, placeholder: 'Search', label: 'Search alerts' }}
          onReset={() => {}}
        >
          <FilterMenu
            label="Status"
            value={filters.status}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            onChange={() => {}}
          />
          <SavedViewsMenu
            storageKey="test"
            presets={[{ id: 'all', name: 'All', filters }]}
            current={filters}
            onApply={() => {}}
          />
        </FilterBar>,
      ),
    ).toEqual([]);
  });

  it('sortable table header', async () => {
    expect(
      await violations(
        <Table>
          <Table.Thead>
            <Table.Tr>
              <SortTh sort={{ direction: 'asc', onSort: () => {} }}>Asset</SortTh>
              <SortTh sort={{ direction: null, onSort: () => {} }} ta="right">
                Health
              </SortTh>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Pump</Table.Td>
              <Table.Td>72</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>,
      ),
    ).toEqual([]);
  });

  it('empty and error states', async () => {
    expect(
      await violations(
        <>
          <EmptyState icon={<span />} title="All clear" description="Nothing to do." />
          <ErrorState error={new Error('Network down')} onRetry={() => {}} />
        </>,
      ),
    ).toEqual([]);
  });
});
