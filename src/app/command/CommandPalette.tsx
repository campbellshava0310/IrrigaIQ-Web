import { Group, Kbd, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { Spotlight, useSpotlight, type SpotlightActionGroupData } from '@mantine/spotlight';
import {
  IconArrowsExchange,
  IconBook2,
  IconCalendarPlus,
  IconDroplet,
  IconEngine,
  IconKeyboard,
  IconLogout,
  IconMoon,
  IconPlant2,
  IconPlus,
  IconRouter,
  IconSparkles,
  IconSearch,
  IconSun,
  IconTool,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import { NAVIGATION } from '@/app/navigation';
import { assistant } from '@/features/assistant/store';
import { useAuth } from '@/features/auth/useAuth';
import { useFields } from '@/features/farms/api';
import { useCurrentFarm } from '@/features/farms/currentFarm';
import { useAssets } from '@/features/infrastructure/api';
import { ASSET_STATUS, ASSET_TYPE } from '@/features/infrastructure/presentation';
import { formatHectares, humanize } from '@/lib/format';

import { GO_SHORTCUTS, MOD_KEY, paletteStore, type PageCommand } from './palette';

const ICON = { size: 18, stroke: 1.7 } as const;

function Keys({ keys }: { keys: string[] }) {
  return (
    <Group gap={4} wrap="nowrap">
      {keys.map((key) => (
        <Kbd key={key} size="xs">
          {key}
        </Kbd>
      ))}
    </Group>
  );
}

/**
 * ⌘K / Ctrl K (or "/"): jump to any screen, field or asset on the current farm, switch farm, or
 * start a common task. Fields and assets load only while the palette is open.
 */
export function CommandPalette({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const navigate = useNavigate();
  const { opened } = useSpotlight(paletteStore);
  const { farm, farms, select } = useCurrentFarm();
  const { hasRole, logout } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  const fields = useFields(farm?.id ?? '', opened);
  const assets = useAssets(farm?.id, opened);

  const run = (command: PageCommand, path: string) => navigate(`${path}?do=${command}`);
  const goKey = (to: string) => GO_SHORTCUTS.find((shortcut) => shortcut.to === to)?.key;

  const groups: SpotlightActionGroupData[] = [
    {
      group: 'Go to',
      actions: NAVIGATION.filter(
        (section) => !section.requiredRole || hasRole(section.requiredRole),
      )
        .flatMap((section) => section.items)
        .map((item) => {
          const key = goKey(item.to);
          return {
            id: `go-${item.to}`,
            label: item.label,
            leftSection: <item.icon {...ICON} />,
            rightSection: key ? <Keys keys={['G', key.toUpperCase()]} /> : undefined,
            onClick: () => navigate(item.to),
          };
        }),
    },
    {
      group: 'Actions',
      actions: [
        {
          id: 'assistant',
          label: 'Ask IrrigaIQ',
          description: 'Questions about fields, water use and equipment',
          keywords: ['ai', 'chat', 'assistant', 'why', 'help'],
          leftSection: <IconSparkles {...ICON} />,
          rightSection: <Keys keys={[MOD_KEY, 'J']} />,
          onClick: () => assistant.open(),
        },
        {
          id: 'log-irrigation',
          label: 'Log an irrigation',
          description: 'Record a run that has happened',
          keywords: ['water', 'record', 'run'],
          leftSection: <IconDroplet {...ICON} />,
          onClick: () => run('log-irrigation', '/irrigation'),
        },
        {
          id: 'plan-irrigation',
          label: 'Plan an irrigation',
          description: 'Schedule a run for later',
          keywords: ['schedule', 'water'],
          leftSection: <IconCalendarPlus {...ICON} />,
          onClick: () => run('plan-irrigation', '/irrigation'),
        },
        {
          id: 'new-work-order',
          label: 'New work order',
          description: 'Service, repair or inspection',
          keywords: ['maintenance', 'repair', 'job'],
          leftSection: <IconTool {...ICON} />,
          onClick: () => run('new-work-order', '/maintenance'),
        },
        {
          id: 'new-asset',
          label: 'Add an asset',
          description: 'Pump, source, filter or line',
          keywords: ['infrastructure', 'pump', 'borehole'],
          leftSection: <IconPlus {...ICON} />,
          onClick: () => run('new-asset', '/infrastructure'),
        },
        {
          id: 'register-device',
          label: 'Register a device',
          description: 'Soil probe, water meter or pump monitor',
          keywords: ['sensor', 'esp32', 'iot', 'probe', 'meter'],
          leftSection: <IconRouter {...ICON} />,
          onClick: () => run('register-device', '/devices'),
        },
        {
          id: 'briefing',
          label: "Read today's briefing",
          keywords: ['ai', 'insight', 'summary'],
          leftSection: <IconBook2 {...ICON} />,
          onClick: () => navigate('/intelligence'),
        },
        {
          id: 'appearance',
          label: scheme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance',
          keywords: ['theme', 'dark mode', 'light mode'],
          leftSection: scheme === 'dark' ? <IconSun {...ICON} /> : <IconMoon {...ICON} />,
          onClick: () => setColorScheme(scheme === 'dark' ? 'light' : 'dark'),
        },
        {
          id: 'shortcuts',
          label: 'Keyboard shortcuts',
          leftSection: <IconKeyboard {...ICON} />,
          rightSection: <Keys keys={['?']} />,
          onClick: onShowShortcuts,
        },
        {
          id: 'sign-out',
          label: 'Sign out',
          leftSection: <IconLogout {...ICON} />,
          onClick: () => void logout(),
        },
      ],
    },
  ];

  if (farm && fields.data && fields.data.length > 0) {
    groups.push({
      group: `Fields · ${farm.name}`,
      actions: fields.data.map((field) => ({
        id: `field-${field.id}`,
        label: field.name,
        description: [
          formatHectares(field.areaHa),
          field.soilType ? humanize(field.soilType) : null,
        ]
          .filter(Boolean)
          .join(' · '),
        keywords: ['field'],
        leftSection: <IconPlant2 {...ICON} />,
        onClick: () => navigate(`/farms/${farm.id}/fields/${field.id}`),
      })),
    });
  }
  if (farm && assets.data && assets.data.length > 0) {
    groups.push({
      group: `Assets · ${farm.name}`,
      actions: assets.data.map((asset) => ({
        id: `asset-${asset.id}`,
        label: asset.name,
        description: `${ASSET_TYPE[asset.type].label} · ${ASSET_STATUS[asset.status].label}`,
        keywords: [ASSET_TYPE[asset.type].label, asset.manufacturer ?? '', asset.model ?? ''],
        leftSection: <IconEngine {...ICON} />,
        onClick: () => navigate(`/farms/${farm.id}/assets/${asset.id}`),
      })),
    });
  }
  if (farms.length > 1) {
    groups.push({
      group: 'Switch farm',
      actions: farms
        .filter((candidate) => candidate.id !== farm?.id)
        .map((candidate) => ({
          id: `farm-${candidate.id}`,
          label: candidate.name,
          description: candidate.location ?? undefined,
          keywords: ['farm', 'switch'],
          leftSection: <IconArrowsExchange {...ICON} />,
          onClick: () => {
            select(candidate.id);
            navigate('/');
          },
        })),
    });
  }

  return (
    <Spotlight
      store={paletteStore}
      actions={groups}
      shortcut={['mod + K', '/']}
      nothingFound="Nothing matches. Try a screen, field or asset name."
      highlightQuery
      limit={40}
      scrollable
      maxHeight={440}
      radius="md"
      classNames={{ actionsGroup: 'app-palette-group', action: 'app-palette-action' }}
      searchProps={{
        leftSection: <IconSearch size={18} stroke={1.7} />,
        placeholder: 'Search screens, fields, assets and actions…',
      }}
    />
  );
}
