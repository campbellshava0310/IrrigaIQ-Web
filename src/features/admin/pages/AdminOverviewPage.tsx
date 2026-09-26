import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronRight,
  IconDeviceDesktop,
  IconGrid4x4,
  IconHistory,
  IconLeaf,
  IconLock,
  IconPlant2,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
import { humanize } from '@/lib/format';

import { useAdminOverview, useSystemHealth } from '../api';
import { DemoFarmCard } from '../components/DemoFarmCard';

const statusColor = (status: string) =>
  status === 'UP' ? 'teal' : status === 'UNKNOWN' ? 'gray' : 'red';

const STATUS_LABEL: Record<string, string> = {
  UP: 'Healthy',
  DOWN: 'Down',
  OUT_OF_SERVICE: 'Out of service',
  UNKNOWN: 'Unknown',
};

/** Spring Boot health component ids, in words an administrator would use. */
const COMPONENT_LABEL: Record<string, string> = {
  db: 'Database',
  diskSpace: 'Disk space',
  livenessState: 'Liveness',
  readinessState: 'Readiness',
  ping: 'Ping',
  ssl: 'TLS certificates',
  mail: 'Email',
};

export function AdminOverviewPage() {
  const overview = useAdminOverview();
  const health = useSystemHealth();
  const data = overview.data;

  return (
    <>
      <PageHeader
        title="Administration"
        description="Platform-wide users, sessions, data and system health."
      />
      {overview.isError && <ErrorState error={overview.error} onRetry={() => overview.refetch()} />}

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="lg">
        <StatCard
          label="Users"
          value={data?.users.total ?? 0}
          hint={data ? `${data.users.enabled} enabled` : undefined}
          icon={<IconUsers size={20} />}
          loading={overview.isPending}
        />
        <StatCard
          label="Administrators"
          value={data?.users.admins ?? 0}
          icon={<IconShieldCheck size={20} />}
          loading={overview.isPending}
        />
        <StatCard
          label="Locked accounts"
          value={data?.users.locked ?? 0}
          icon={<IconLock size={20} />}
          color={data?.users.locked ? 'orange' : 'teal'}
          loading={overview.isPending}
        />
        <StatCard
          label="Active sessions"
          value={data?.activeSessions ?? 0}
          icon={<IconDeviceDesktop size={20} />}
          loading={overview.isPending}
        />
        <StatCard
          label="Farms"
          value={data?.farms.farms ?? 0}
          icon={<IconPlant2 size={20} />}
          loading={overview.isPending}
        />
        <StatCard
          label="Fields"
          value={data?.farms.fields ?? 0}
          icon={<IconGrid4x4 size={20} />}
          loading={overview.isPending}
        />
        <StatCard
          label="Crops"
          value={data?.farms.crops ?? 0}
          icon={<IconLeaf size={20} />}
          loading={overview.isPending}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3} fz="lg">
              System health
            </Title>
            {health.data && (
              <Badge color={statusColor(health.data.status)} variant="dot">
                {STATUS_LABEL[health.data.status] ?? humanize(health.data.status)}
              </Badge>
            )}
          </Group>
          {health.isPending && <LoadingState />}
          {health.isError && <ErrorState error={health.error} onRetry={() => health.refetch()} />}
          <Stack gap={0}>
            {Object.entries(health.data?.components ?? {}).map(([name, component], index) => (
              <Group
                key={name}
                justify="space-between"
                py={10}
                style={index > 0 ? { borderTop: '1px solid var(--app-border)' } : undefined}
              >
                <Text size="sm">
                  {COMPONENT_LABEL[name] ?? humanize(name.replace(/([a-z])([A-Z])/g, '$1_$2'))}
                </Text>
                <Badge size="sm" color={statusColor(component.status)} variant="dot">
                  {STATUS_LABEL[component.status] ?? humanize(component.status)}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Card>

        <Stack gap="lg">
          <AdminLink
            to="/admin/users"
            icon={<IconUsers size={20} />}
            title="Users"
            description="Create accounts, assign roles, unlock or disable users."
          />
          <AdminLink
            to="/admin/audit"
            icon={<IconHistory size={20} />}
            title="Audit log"
            description="Sign-ins, lockouts, role changes and other security events."
          />
          <DemoFarmCard />
        </Stack>
      </SimpleGrid>
    </>
  );
}

function AdminLink({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <UnstyledButton component={Link} to={to}>
      <Card withBorder data-interactive>
        <Group justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            <ThemeIcon variant="light" size={36} radius="md">
              {icon}
            </ThemeIcon>
            <div>
              <Text fw={600}>{title}</Text>
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            </div>
          </Group>
          <IconChevronRight size={18} color="var(--app-text-muted)" />
        </Group>
      </Card>
    </UnstyledButton>
  );
}
