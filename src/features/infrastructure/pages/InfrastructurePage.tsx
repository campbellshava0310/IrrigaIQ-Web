import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconEngine,
  IconPlugConnectedX,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { daysFromToday, formatDate, formatDueIn } from '@/lib/format';

import { useAssets } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { ASSET_STATUS, ASSET_TYPE, CATEGORY, CRITICALITY, RISK, scoreColor } from '../presentation';
import { ASSET_CATEGORIES, type Asset, type AssetCategory, type RiskLevel } from '../types';

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

export function InfrastructurePage() {
  return <RequireFarm>{(farm) => <Infrastructure farm={farm} />}</RequireFarm>;
}

function Infrastructure({ farm }: { farm: Farm }) {
  const assets = useAssets(farm.id);
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'network'>('list');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | null>(null);
  const [risk, setRisk] = useState<string>('ALL');
  const [formOpened, form] = useDisclosure(false);

  const all = useMemo(() => assets.data ?? [], [assets.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all
      .filter((asset) => !category || asset.category === category)
      .filter((asset) =>
        risk === 'ALL'
          ? true
          : risk === 'AT_RISK'
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
  }, [all, category, risk, search]);

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
        description="Every source, pump, filter and line that gets water to your crops. Health scores and service forecasts flag problems weeks before they stop irrigation."
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
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="xl">
            <StatCard
              label="Assets"
              value={all.length}
              hint={`${new Set(all.map((a) => a.category)).size} system types`}
              icon={<IconEngine size={16} />}
              color="gray"
            />
            <StatCard
              label="At risk"
              value={atRisk}
              hint="High or critical risk"
              icon={<IconAlertTriangle size={16} />}
              color={atRisk ? 'red' : 'teal'}
            />
            <StatCard
              label="Service overdue"
              value={overdue}
              hint={`${dueSoon} more due within 14 days`}
              icon={<IconCalendarDue size={16} />}
              color={overdue ? 'orange' : 'teal'}
            />
            <StatCard
              label="Down or degraded"
              value={down}
              hint="Reported by the team"
              icon={<IconPlugConnectedX size={16} />}
              color={down ? 'red' : 'teal'}
            />
          </SimpleGrid>

          <Group justify="space-between" mb="md" gap="sm">
            <Group gap="sm">
              <TextInput
                placeholder="Search name, make, model"
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                w={240}
                aria-label="Search assets"
              />
              <Select
                placeholder="All systems"
                data={ASSET_CATEGORIES.map((value) => ({ value, label: CATEGORY[value].label }))}
                value={category}
                onChange={(value) => setCategory(value as AssetCategory | null)}
                clearable
                w={200}
                aria-label="Filter by system"
              />
              <SegmentedControl
                value={risk}
                onChange={setRisk}
                data={[
                  { value: 'ALL', label: 'All' },
                  { value: 'AT_RISK', label: 'At risk' },
                  { value: 'OVERDUE', label: 'Service overdue' },
                ]}
              />
            </Group>
            <SegmentedControl
              value={view}
              onChange={(value) => setView(value as 'list' | 'network')}
              data={[
                { value: 'list', label: 'List' },
                { value: 'network', label: 'Water network' },
              ]}
            />
          </Group>

          {view === 'list' ? (
            <AssetTable
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
        opened={formOpened}
        onClose={form.close}
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
    <Stack gap={0}>
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

function AssetTable({ assets, onOpen }: { assets: Asset[]; onOpen: (asset: Asset) => void }) {
  if (assets.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No assets match these filters.
      </Text>
    );
  }
  return (
    <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
      <Table.ScrollContainer minWidth={900}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Asset</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Health</Table.Th>
              <Table.Th>Next service</Table.Th>
              <Table.Th>Top issue</Table.Th>
              <Table.Th>Criticality</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {assets.map((asset) => {
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
                  <Table.Td>
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
                          fw={650}
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
                  <Table.Td maw={280}>
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
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
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
