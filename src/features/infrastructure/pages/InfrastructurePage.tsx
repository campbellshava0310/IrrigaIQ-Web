import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconClipboardCheck,
  IconEngine,
  IconPlus,
  IconSearch,
  IconTool,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { usePageCommand } from '@/app/command/usePageCommand';
import { FilterBar, FilterMenu } from '@/components/filters/FilterBar';
import { sameFilters, type SavedView } from '@/components/filters/savedViews';
import { SavedViewsMenu } from '@/components/filters/SavedViewsMenu';
import { PageHeader } from '@/components/PageHeader';
import { SortTh } from '@/components/table/SortTh';
import { useSort } from '@/components/table/useSort';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { Metric, MetricStrip } from '@/components/MetricStrip';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { WorkOrderFormModal } from '@/features/maintenance/components/WorkOrderFormModal';
import { daysFromToday, formatDate, formatDueIn } from '@/lib/format';

import { useAssets } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { ConditionCheckModal } from '../components/ConditionCheckModal';
import { ASSET_STATUS, ASSET_TYPE, CATEGORY, CRITICALITY, RISK, scoreColor } from '../presentation';
import { ASSET_CATEGORIES, type Asset, type AssetCategory, type RiskLevel } from '../types';

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

const CRITICALITY_ORDER: Record<Asset['criticality'], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type HealthFilter = 'AT_RISK' | 'OVERDUE';

interface AssetFilters {
  search: string;
  category: AssetCategory | null;
  health: HealthFilter | null;
}

const DEFAULT_FILTERS: AssetFilters = { search: '', category: null, health: null };

const PRESETS: SavedView<AssetFilters>[] = [
  { id: 'all', name: 'All assets', filters: DEFAULT_FILTERS },
  { id: 'at-risk', name: 'At risk', filters: { ...DEFAULT_FILTERS, health: 'AT_RISK' } },
  { id: 'overdue', name: 'Service overdue', filters: { ...DEFAULT_FILTERS, health: 'OVERDUE' } },
  { id: 'pumps', name: 'Pumps', filters: { ...DEFAULT_FILTERS, category: 'PUMPING' } },
];

export function InfrastructurePage() {
  return <RequireFarm>{(farm) => <Infrastructure farm={farm} />}</RequireFarm>;
}

function Infrastructure({ farm }: { farm: Farm }) {
  const assets = useAssets(farm.id);
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'network'>('list');
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);
  const { search, category, health } = filters;
  const [formOpened, form] = useDisclosure(false);
  const [command, clearCommand] = usePageCommand();

  const all = useMemo(() => assets.data ?? [], [assets.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all
      .filter((asset) => !category || asset.category === category)
      .filter((asset) =>
        health == null
          ? true
          : health === 'AT_RISK'
            ? isAtRisk(asset)
            : asset.health?.service?.overdue,
      )
      .filter(
        (asset) =>
          !query ||
          [asset.name, asset.manufacturer, asset.model, ASSET_TYPE[asset.type].label]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query)),
      )
      .sort(
        (a, b) =>
          RISK_ORDER[a.health?.risk ?? 'LOW'] - RISK_ORDER[b.health?.risk ?? 'LOW'] ||
          (a.health?.score ?? 100) - (b.health?.score ?? 100) ||
          a.name.localeCompare(b.name),
      );
  }, [all, category, health, search]);

  const atRisk = all.filter(isAtRisk).length;
  const overdue = all.filter((asset) => asset.health?.service?.overdue).length;
  const dueSoon = all.filter(
    (asset) =>
      !asset.health?.service?.overdue &&
      asset.health?.service?.dueOn &&
      daysFromToday(asset.health.service.dueOn) <= 14,
  ).length;
  const down = all.filter((asset) => asset.status === 'DOWN' || asset.status === 'DEGRADED').length;

  return (
    <>
      <PageHeader
        title="Infrastructure"
        description="Health and service outlook for every source, pump, filter and line."
        help="Health scores and service forecasts flag problems weeks before they stop irrigation."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={form.open}>
            Add asset
          </Button>
        }
      />

      {assets.isPending && <LoadingState layout="page" label="Assessing asset health…" />}
      {assets.isError && <ErrorState error={assets.error} onRetry={() => assets.refetch()} />}

      {assets.data && all.length === 0 && (
        <EmptyState
          icon={<IconEngine size={24} />}
          title="Map your water infrastructure"
          description="Start with your water sources and pumps, then filters, mainlines and in-field systems. Link each to what feeds it to build the network, and to the fields it serves."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={form.open}>
              Add the first asset
            </Button>
          }
        />
      )}

      {all.length > 0 && (
        <>
          <Box mb="xl">
            <MetricStrip label="Infrastructure at a glance">
              <Metric
                label="Assets"
                value={all.length}
                hint={`${new Set(all.map((a) => a.category)).size} system types`}
              />
              <Metric
                label="At risk"
                value={atRisk}
                tone={atRisk ? 'critical' : 'good'}
                hint="High or critical risk"
              />
              <Metric
                label="Service overdue"
                value={overdue}
                tone={overdue ? 'serious' : 'good'}
                hint={`${dueSoon} more due within 14 days`}
              />
              <Metric
                label="Down or degraded"
                value={down}
                tone={down ? 'critical' : 'good'}
                hint="Reported by the team"
              />
            </MetricStrip>
          </Box>

          <FilterBar
            search={{
              value: search,
              onChange: (value) => setFilters({ ...filters, search: value }),
              placeholder: 'Search name, make, model',
              label: 'Search assets',
            }}
            onReset={
              sameFilters(filters, DEFAULT_FILTERS) ? undefined : () => setFilters(DEFAULT_FILTERS)
            }
            end={
              <>
                <Text size="sm" c="dimmed" className="app-num" visibleFrom="sm">
                  {filtered.length} of {all.length}
                </Text>
                <SegmentedControl
                  size="sm"
                  value={view}
                  onChange={(value) => setView(value as 'list' | 'network')}
                  data={[
                    { value: 'list', label: 'List' },
                    { value: 'network', label: 'Network' },
                  ]}
                  aria-label="Display as"
                />
              </>
            }
          >
            <FilterMenu
              label="System"
              allLabel="All"
              value={category}
              options={ASSET_CATEGORIES.map((value) => ({ value, label: CATEGORY[value].label }))}
              onChange={(value) => setFilters({ ...filters, category: value })}
            />
            <FilterMenu
              label="Health"
              allLabel="All"
              value={health}
              options={[
                { value: 'AT_RISK', label: 'At risk' },
                { value: 'OVERDUE', label: 'Service overdue' },
              ]}
              onChange={(value) => setFilters({ ...filters, health: value })}
            />
            <SavedViewsMenu
              storageKey="infrastructure"
              presets={PRESETS}
              current={filters}
              onApply={setFilters}
            />
          </FilterBar>

          {view === 'list' ? (
            <AssetTable
              farmId={farm.id}
              assets={filtered}
              onOpen={(asset) => navigate(`/farms/${farm.id}/assets/${asset.id}`)}
            />
          ) : (
            <NetworkView
              assets={all}
              highlight={new Set(filtered.map((asset) => asset.id))}
              onOpen={(asset) => navigate(`/farms/${farm.id}/assets/${asset.id}`)}
            />
          )}
        </>
      )}

      <AssetFormModal
        opened={formOpened || command === 'new-asset'}
        onClose={() => {
          form.close();
          clearCommand();
        }}
        farmId={farm.id}
        onSaved={(asset) => navigate(`/farms/${farm.id}/assets/${asset.id}`)}
      />
    </>
  );
}

function isAtRisk(asset: Asset): boolean {
  return asset.health?.risk === 'HIGH' || asset.health?.risk === 'CRITICAL';
}

function AssetIcon({ asset, size = 34 }: { asset: Asset; size?: number }) {
  const Icon = ASSET_TYPE[asset.type].icon;
  return (
    <ThemeIcon
      variant="light"
      color={asset.health ? scoreColor(asset.health.score) : 'gray'}
      size={size}
      radius="md"
    >
      <Icon size={Math.round(size * 0.55)} stroke={1.7} />
    </ThemeIcon>
  );
}

function ServiceCell({ asset }: { asset: Asset }) {
  const service = asset.health?.service;
  if (!service?.dueOn) {
    return (
      <Text size="sm" c="dimmed">
        No plan
      </Text>
    );
  }
  return (
    <Stack gap={0} style={{ whiteSpace: 'nowrap' }}>
      <Text
        size="sm"
        c={service.overdue ? 'red' : undefined}
        fw={service.overdue ? 600 : undefined}
      >
        {service.overdue
          ? `Overdue ${formatDueIn(service.dueOn).replace(' ago', '')}`
          : formatDueIn(service.dueOn)}
      </Text>
      <Text size="xs" c="dimmed">
        {formatDate(service.dueOn)}
        {service.basis === 'RUN_HOURS' ? ' · by run-hours' : ''}
      </Text>
    </Stack>
  );
}

function AssetTable({
  farmId,
  assets,
  onOpen,
}: {
  farmId: string;
  assets: Asset[];
  onOpen: (asset: Asset) => void;
}) {
  const [checking, setChecking] = useState<Asset | null>(null);
  const [ordering, setOrdering] = useState<Asset | null>(null);
  const { sorted, header } = useSort(assets, {
    name: (asset) => asset.name,
    status: (asset) => ASSET_STATUS[asset.status].label,
    health: (asset) => asset.health?.score,
    service: (asset) => asset.health?.service?.dueOn,
    criticality: (asset) => CRITICALITY_ORDER[asset.criticality],
  });

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<IconSearch size={22} />}
        title="No assets match these filters"
        description="Clear a filter or pick another view."
      />
    );
  }
  return (
    <Card withBorder padding={0} className="app-table-card">
      <div className="app-table-scroll">
        <Table highlightOnHover stickyHeader miw={960}>
          <Table.Thead>
            <Table.Tr>
              <SortTh sort={header('name')} w={280}>
                Asset
              </SortTh>
              <SortTh sort={header('status')}>Status</SortTh>
              <SortTh sort={header('health')}>Health</SortTh>
              <SortTh sort={header('service')}>Next service</SortTh>
              <Table.Th>Top issue</Table.Th>
              <SortTh sort={header('criticality')}>Criticality</SortTh>
              <Table.Th w={96}>
                <span className="app-visually-hidden">Actions</span>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((asset) => {
              const topFactor = asset.health?.factors.find((factor) => factor.impact < 0);
              return (
                <Table.Tr
                  key={asset.id}
                  onClick={() => onOpen(asset)}
                  style={{ cursor: 'pointer' }}
                  tabIndex={0}
                  onKeyDown={(event) => event.key === 'Enter' && onOpen(asset)}
                  aria-label={`Open ${asset.name}`}
                >
                  <Table.Td maw={280}>
                    <Group gap="sm" wrap="nowrap">
                      <AssetIcon asset={asset} />
                      <Stack gap={0} miw={0}>
                        <Text fw={600} size="sm" truncate>
                          {asset.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {ASSET_TYPE[asset.type].label}
                          {asset.manufacturer ? ` · ${asset.manufacturer}` : ''}
                          {asset.model ? ` ${asset.model}` : ''}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="dot" color={ASSET_STATUS[asset.status].color}>
                      {ASSET_STATUS[asset.status].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {asset.health ? (
                      <Group gap="xs" wrap="nowrap">
                        <Text
                          fw={600}
                          c={scoreColor(asset.health.score)}
                          w={28}
                          ta="right"
                          className="app-num"
                        >
                          {asset.health.score}
                        </Text>
                        <Badge variant="dot" color={RISK[asset.health.risk].color}>
                          {RISK[asset.health.risk].label}
                        </Badge>
                      </Group>
                    ) : (
                      '—'
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ServiceCell asset={asset} />
                  </Table.Td>
                  <Table.Td miw={200} maw={280}>
                    <Text size="sm" lineClamp={2}>
                      {topFactor ? (
                        topFactor.label
                      ) : (
                        <Text span c="dimmed" size="sm">
                          Nothing flagged
                        </Text>
                      )}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{CRITICALITY[asset.criticality].label}</Text>
                  </Table.Td>
                  <Table.Td onClick={(event) => event.stopPropagation()}>
                    <Group gap={4} wrap="nowrap" justify="flex-end" className="app-row-action">
                      <Tooltip label="Record a condition check">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`Condition check for ${asset.name}`}
                          onClick={() => setChecking(asset)}
                        >
                          <IconClipboardCheck size={17} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="New work order">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`New work order for ${asset.name}`}
                          onClick={() => setOrdering(asset)}
                        >
                          <IconTool size={17} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
      {checking && (
        <ConditionCheckModal
          opened
          onClose={() => setChecking(null)}
          farmId={farmId}
          asset={checking}
        />
      )}
      <WorkOrderFormModal
        opened={ordering != null}
        onClose={() => setOrdering(null)}
        farmId={farmId}
        draft={
          ordering
            ? {
                assetId: ordering.id,
                kind: isAtRisk(ordering) ? 'PREDICTIVE' : 'CORRECTIVE',
                priority: isAtRisk(ordering) ? 'HIGH' : 'MEDIUM',
                title: `${ordering.name}: `,
              }
            : undefined
        }
      />
    </Card>
  );
}

/** Source → pump → treatment → distribution → field, from each asset's "fed by" link. */
function NetworkView({
  assets,
  highlight,
  onOpen,
}: {
  assets: Asset[];
  highlight: Set<string>;
  onOpen: (asset: Asset) => void;
}) {
  const ids = new Set(assets.map((asset) => asset.id));
  const children = new Map<string, Asset[]>();
  for (const asset of assets) {
    if (asset.parentId && ids.has(asset.parentId)) {
      children.set(asset.parentId, [...(children.get(asset.parentId) ?? []), asset]);
    }
  }
  const byCategory = (a: Asset, b: Asset) =>
    CATEGORY[a.category].order - CATEGORY[b.category].order || a.name.localeCompare(b.name);
  const roots = assets
    .filter((asset) => !asset.parentId || !ids.has(asset.parentId))
    .sort(byCategory);

  const renderNode = (asset: Asset, depth: number, trail: Set<string>): React.ReactNode => {
    const kids = trail.has(asset.id) ? [] : (children.get(asset.id) ?? []).sort(byCategory);
    const nextTrail = new Set(trail).add(asset.id);
    return (
      <Box key={`${asset.id}-${depth}`}>
        <UnstyledButton
          className="app-row"
          onClick={() => onOpen(asset)}
          style={{ opacity: highlight.has(asset.id) ? 1 : 0.45 }}
          aria-label={`Open ${asset.name}`}
        >
          <Group gap="sm" wrap="nowrap">
            <AssetIcon asset={asset} size={30} />
            <Stack gap={0} miw={0} style={{ flex: 1 }}>
              <Text size="sm" fw={600} truncate>
                {asset.name}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {ASSET_TYPE[asset.type].label}
                {asset.health?.factors[0] && asset.health.factors[0].impact < 0
                  ? ` · ${asset.health.factors[0].label}`
                  : ''}
              </Text>
            </Stack>
            {asset.status !== 'OPERATIONAL' && (
              <Badge variant="dot" color={ASSET_STATUS[asset.status].color} size="sm">
                {ASSET_STATUS[asset.status].label}
              </Badge>
            )}
            {asset.health && (
              <Badge variant="dot" color={RISK[asset.health.risk].color} size="sm">
                {asset.health.score}
              </Badge>
            )}
          </Group>
        </UnstyledButton>
        {kids.length > 0 && (
          <Box ml={22} pl="md" style={{ borderLeft: '1px solid var(--app-border-strong)' }}>
            {kids.map((kid) => renderNode(kid, depth + 1, nextTrail))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Water flows down the tree. An asset failing upstream stops everything below it, so upstream
        warnings deserve the fastest response.
      </Text>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {roots.map((root) => (
          <Card key={root.id} withBorder padding="xs">
            {renderNode(root, 0, new Set())}
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
