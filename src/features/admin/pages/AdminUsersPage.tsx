import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Pagination,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  IconDots,
  IconLockOpen,
  IconLogout,
  IconPencil,
  IconPlus,
  IconUserOff,
  IconUserCheck,
} from '@tabler/icons-react';
import { useState } from 'react';

import { FilterBar, FilterMenu } from '@/components/filters/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryStates';
import { useAuth } from '@/features/auth/useAuth';
import type { Role } from '@/lib/auth/types';
import { confirmDestructive } from '@/lib/confirm';
import { formatRelative } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useAdminUsers, useRevokeUserSessions, useUnlockUser, useUpdateUser } from '../api';
import { CreateUserModal, EditUserModal } from '../components/UserModals';
import { ROLES, type AdminUser } from '../types';

const ROLE_LABEL = Object.fromEntries(ROLES.map((role) => [role.value, role.label])) as Record<
  Role,
  string
>;

function StatusBadge({ user }: { user: AdminUser }) {
  if (!user.enabled) {
    return (
      <Badge color="gray" variant="dot">
        Disabled
      </Badge>
    );
  }
  if (user.locked) {
    return (
      <Badge color="yellow" variant="dot">
        Locked
      </Badge>
    );
  }
  return (
    <Badge color="green" variant="dot">
      Active
    </Badge>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search.trim(), 300);
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState<'enabled' | 'disabled' | null>(null);
  const [page, setPage] = useState(1);
  const users = useAdminUsers({
    q: query,
    role,
    enabled: status === null ? null : status === 'enabled',
    page: page - 1,
  });
  const updateUser = useUpdateUser();
  const unlockUser = useUnlockUser();
  const revokeSessions = useRevokeUserSessions();
  const [createOpened, create] = useDisclosure(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editOpened, edit] = useDisclosure(false);
  const openEdit = (user: AdminUser) => {
    setEditing(user);
    edit.open();
  };

  const toggleEnabled = (user: AdminUser) => {
    const action = () =>
      updateUser.mutate(
        { id: user.id, input: { enabled: !user.enabled } },
        {
          onSuccess: () => notifySuccess(`${user.email} ${user.enabled ? 'disabled' : 'enabled'}`),
          onError: (error) => notifyError(error),
        },
      );
    if (user.enabled) {
      confirmDestructive({
        title: `Disable ${user.fullName}?`,
        message:
          'They will be signed out of every device and will not be able to sign in until re-enabled.',
        confirmLabel: 'Disable',
        onConfirm: action,
      });
    } else {
      action();
    }
  };

  const signOutEverywhere = (user: AdminUser) =>
    confirmDestructive({
      title: `Sign ${user.fullName} out everywhere?`,
      message:
        'All of their sessions end now. Access tokens already issued expire within 15 minutes.',
      confirmLabel: 'Sign out',
      onConfirm: () =>
        revokeSessions.mutate(user.id, {
          onSuccess: () => notifySuccess(`${user.email} signed out of all devices`),
          onError: (error) => notifyError(error),
        }),
    });

  const unlock = (user: AdminUser) =>
    unlockUser.mutate(user.id, {
      onSuccess: () => notifySuccess(`${user.email} unlocked`),
      onError: (error) => notifyError(error),
    });

  return (
    <>
      <PageHeader
        back={{ to: '/admin', label: 'Administration' }}
        title="Users"
        description="Manage accounts, roles and access."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={create.open}>
            Create user
          </Button>
        }
      />
      <FilterBar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: 'Search name or email',
          label: 'Search users',
        }}
        onReset={
          search === '' && role == null && status == null
            ? undefined
            : () => {
                setSearch('');
                setRole(null);
                setStatus(null);
                setPage(1);
              }
        }
        end={
          users.data && (
            <Text size="sm" c="dimmed" className="app-num">
              {users.data.totalElements} {users.data.totalElements === 1 ? 'user' : 'users'}
            </Text>
          )
        }
      >
        <FilterMenu
          label="Role"
          allLabel="All"
          value={role}
          options={ROLES.map(({ value, label }) => ({ value, label }))}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        />
        <FilterMenu
          label="Status"
          allLabel="Any"
          value={status}
          options={[
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' },
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </FilterBar>
      <Card withBorder padding={0} className="app-table-card">
        {users.isPending && <LoadingState label="Loading users…" />}
        {users.isError && <ErrorState error={users.error} onRetry={() => users.refetch()} />}
        {users.data && (
          <>
            <div className="app-table-scroll">
              <Table stickyHeader miw={760} verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Roles</Table.Th>
                    <Table.Th miw={100}>Status</Table.Th>
                    <Table.Th>Last sign-in</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th w={48}>
                      <span className="app-visually-hidden">Actions</span>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.data.content.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm" fw={600}>
                            {user.fullName}{' '}
                            {user.id === me?.id && (
                              <Text span size="xs" c="dimmed">
                                (you)
                              </Text>
                            )}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {user.email}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {user.roles.map((item) => (
                            <Badge
                              key={item}
                              size="sm"
                              variant={item === 'ADMIN' ? 'filled' : 'light'}
                            >
                              {ROLE_LABEL[item]}
                            </Badge>
                          ))}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge user={user} />
                      </Table.Td>
                      <Table.Td>{formatRelative(user.lastLoginAt)}</Table.Td>
                      <Table.Td>{formatRelative(user.createdAt)}</Table.Td>
                      <Table.Td>
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              aria-label={`Actions for ${user.email}`}
                            >
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconPencil size={14} />}
                              onClick={() => openEdit(user)}
                            >
                              Edit
                            </Menu.Item>
                            {user.locked && (
                              <Menu.Item
                                leftSection={<IconLockOpen size={14} />}
                                onClick={() => unlock(user)}
                              >
                                Unlock
                              </Menu.Item>
                            )}
                            <Menu.Item
                              leftSection={<IconLogout size={14} />}
                              onClick={() => signOutEverywhere(user)}
                            >
                              Sign out everywhere
                            </Menu.Item>
                            {user.id !== me?.id && (
                              <Menu.Item
                                color={user.enabled ? 'red' : undefined}
                                leftSection={
                                  user.enabled ? (
                                    <IconUserOff size={14} />
                                  ) : (
                                    <IconUserCheck size={14} />
                                  )
                                }
                                onClick={() => toggleEnabled(user)}
                              >
                                {user.enabled ? 'Disable' : 'Enable'}
                              </Menu.Item>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {users.data.content.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Text c="dimmed" ta="center" py="md">
                          No users match these filters.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
            <Group justify="space-between" p="md">
              <Text size="sm" c="dimmed">
                {users.data.totalElements} users
              </Text>
              {users.data.totalPages > 1 && (
                <Pagination
                  total={users.data.totalPages}
                  value={page}
                  onChange={setPage}
                  size="sm"
                />
              )}
            </Group>
          </>
        )}
      </Card>

      <CreateUserModal opened={createOpened} onClose={create.close} />
      <EditUserModal
        opened={editOpened}
        user={editing}
        isSelf={editing?.id === me?.id}
        onClose={edit.close}
      />
    </>
  );
}
