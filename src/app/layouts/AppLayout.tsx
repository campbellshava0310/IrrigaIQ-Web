import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Group,
  Indicator,
  Menu,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconBell,
  IconLogout,
  IconMoon,
  IconSelector,
  IconSun,
  IconUserCircle,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router';

import { NAVIGATION, isActive, type NavItem } from '@/app/navigation';
import { Brand } from '@/components/Brand';
import { useAlerts } from '@/features/alerts/api';
import { useAuth } from '@/features/auth/useAuth';
import { FarmSwitcher } from '@/features/farms/components/FarmSwitcher';
import { useCurrentFarm } from '@/features/farms/currentFarm';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Active alerts on the current farm; critical ones turn the count red. */
function useActiveAlerts() {
  const { farm } = useCurrentFarm();
  const alerts = useAlerts(farm?.id);
  const active = (alerts.data ?? []).filter((alert) => alert.state !== 'RESOLVED');
  return {
    count: active.length,
    critical: active.some((alert) => alert.severity === 'CRITICAL' && alert.state === 'OPEN'),
  };
}

function AlertsBell() {
  const { count, critical } = useActiveAlerts();
  const label = count === 0 ? 'No active alerts' : `${count} active alerts`;
  return (
    <Indicator
      disabled={count === 0}
      label={count > 9 ? '9+' : count}
      size={16}
      color={critical ? 'red' : 'orange'}
      offset={4}
    >
      <ActionIcon
        component={Link}
        to="/alerts"
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={label}
      >
        <IconBell size={20} stroke={1.7} />
      </ActionIcon>
    </Indicator>
  );
}

function NavEntry({
  item,
  active,
  count,
  critical,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
  critical?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={item.to}
      className="app-nav-item"
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <item.icon size={18} stroke={1.75} className="app-nav-icon" />
      <Text span inherit truncate style={{ flex: 1 }}>
        {item.label}
      </Text>
      {count != null && count > 0 && (
        <Badge
          size="sm"
          radius="sm"
          variant={critical ? 'filled' : 'light'}
          color={critical ? 'red' : 'gray'}
          px={6}
          className="app-num"
          aria-label={`${count} active`}
        >
          {count}
        </Badge>
      )}
    </Link>
  );
}

function UserButton({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  if (!user) {
    return null;
  }
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <Menu position="top-start" width="target" offset={6}>
      <Menu.Target>
        <UnstyledButton className="app-user-button" aria-label="Account menu">
          <Avatar radius="xl" size={32} color="brand" variant="light">
            {initials(user.fullName)}
          </Avatar>
          <Box miw={0} style={{ flex: 1 }}>
            <Text size="sm" fw={600} truncate lh={1.3}>
              {user.fullName}
            </Text>
            <Text size="xs" c="dimmed" truncate lh={1.3}>
              {user.email}
            </Text>
          </Box>
          <IconSelector size={16} color="var(--app-text-muted)" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          to="/account"
          leftSection={<IconUserCircle size={16} />}
          onClick={onNavigate}
        >
          Account & security
        </Menu.Item>
        <Menu.Item
          leftSection={next === 'dark' ? <IconMoon size={16} /> : <IconSun size={16} />}
          onClick={() => setColorScheme(next)}
        >
          {next === 'dark' ? 'Dark appearance' : 'Light appearance'}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconLogout size={16} />} onClick={() => void logout()}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const desktop = useMediaQuery('(min-width: 48em)', true, { getInitialValueInEffect: false });
  const { hasRole } = useAuth();
  const { pathname } = useLocation();
  const alerts = useActiveAlerts();
  const sections = NAVIGATION.filter(
    (section) => !section.requiredRole || hasRole(section.requiredRole),
  );

  return (
    <AppShell
      header={{ height: 56, collapsed: desktop }}
      navbar={{ width: 256, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={{ base: 'md', sm: 'lg', lg: 40 }}
      classNames={{ navbar: 'app-shell-navbar', header: 'app-shell-header' }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} size="sm" aria-label="Toggle navigation" />
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={close}>
              <Brand />
            </Link>
          </Group>
          <AlertsBell />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={12}>
        <AppShell.Section visibleFrom="sm" px={6} pt={6} pb={16}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Brand />
          </Link>
        </AppShell.Section>
        <AppShell.Section pb={16}>
          <FarmSwitcher onNavigate={close} />
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea} mx={-12} px={12}>
          <Stack gap={20} pb="md">
            {sections.map((section) => (
              <nav key={section.title} aria-label={section.title}>
                <Text className="app-nav-section-label">{section.title}</Text>
                <Stack gap={2}>
                  {section.items.map((item) => (
                    <NavEntry
                      key={item.to}
                      item={item}
                      active={isActive(item, pathname)}
                      count={item.badge === 'alerts' ? alerts.count : undefined}
                      critical={item.badge === 'alerts' && alerts.critical}
                      onNavigate={close}
                    />
                  ))}
                </Stack>
              </nav>
            ))}
          </Stack>
        </AppShell.Section>
        <AppShell.Section
          pt={8}
          style={{ borderTop: '1px solid var(--app-border)' }}
          mx={-12}
          px={12}
        >
          <UserButton onNavigate={close} />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1240} mx="auto" pb="xl">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
