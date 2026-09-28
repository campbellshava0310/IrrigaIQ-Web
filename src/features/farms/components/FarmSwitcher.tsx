import { Box, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconSelector, IconSettings } from '@tabler/icons-react';
import { Link } from 'react-router';

import { useCurrentFarm } from '../currentFarm';
import type { Farm } from '../types';

function FarmTile({ name, size = 30 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
  return (
    <Box className="app-farm-tile" w={size} h={size} fz={size * 0.4} aria-hidden>
      {letters}
    </Box>
  );
}

function farmSubtitle(farm: Farm): string {
  const fields = `${farm.fieldCount} ${farm.fieldCount === 1 ? 'field' : 'fields'}`;
  return farm.location ? `${farm.location} · ${fields}` : fields;
}

/** Workspace-style switcher at the top of the sidebar: scopes every operations screen to one farm. */
export function FarmSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { farm, farms, select } = useCurrentFarm();
  if (!farm) {
    return null;
  }
  return (
    <Menu position="bottom-start" width={288} offset={6} styles={{ itemLabel: { minWidth: 0 } }}>
      <Menu.Target>
        <UnstyledButton
          className="app-switcher"
          aria-label={`Current farm: ${farm.name}. Change farm`}
        >
          <FarmTile name={farm.name} />
          <Box miw={0} style={{ flex: 1 }}>
            <Text size="sm" fw={600} truncate lh={1.3}>
              {farm.name}
            </Text>
            <Text size="xs" c="dimmed" truncate lh={1.3}>
              {farmSubtitle(farm)}
            </Text>
          </Box>
          <IconSelector size={16} color="var(--app-text-muted)" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Farms</Menu.Label>
        {farms.map((candidate) => (
          <Menu.Item
            key={candidate.id}
            leftSection={<FarmTile name={candidate.name} size={24} />}
            rightSection={
              candidate.id === farm.id ? (
                <IconCheck size={16} color="var(--mantine-primary-color-filled)" />
              ) : null
            }
            onClick={() => {
              select(candidate.id);
              onNavigate?.();
            }}
          >
            <Text size="sm" fw={candidate.id === farm.id ? 600 : 500} truncate>
              {candidate.name}
            </Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          component={Link}
          to="/farms"
          leftSection={<IconSettings size={16} />}
          onClick={onNavigate}
        >
          Manage farms
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
