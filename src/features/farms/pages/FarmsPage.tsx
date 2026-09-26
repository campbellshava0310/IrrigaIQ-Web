import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Group,
  Menu,
  Pagination,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  IconDots,
  IconPencil,
  IconPlant2,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { useAuth } from '@/features/auth/useAuth';
import { confirmDestructive } from '@/lib/confirm';
import { formatDateTime, formatHectares } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useDeleteFarm, useFarms } from '../api';
import { FarmFormModal } from '../components/FarmFormModal';
import type { Farm } from '../types';

const PAGE_SIZE = 20;

export function FarmsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const farms = useFarms({ q: query, page: page - 1, size: PAGE_SIZE });
  const deleteFarm = useDeleteFarm();
  const [formOpened, form] = useDisclosure(false);
  const [editing, setEditing] = useState<Farm | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    form.open();
  };
  const openEdit = (farm: Farm) => {
    setEditing(farm);
    form.open();
  };
  const confirmDelete = (farm: Farm) =>
    confirmDestructive({
      title: `Delete ${farm.name}?`,
      message:
        'This permanently removes the farm with all of its fields, crops and sensor history.',
      onConfirm: () =>
        deleteFarm.mutate(farm.id, {
          onSuccess: () => notifySuccess(`${farm.name} deleted`),
          onError: (error) => notifyError(error, "Couldn't delete the farm"),
        }),
    });

  const data = farms.data;
  const isEmpty = data?.totalElements === 0 && !query;

  return (
    <>
      <PageHeader
        title="Farms"
        description={isAdmin ? 'All farms on the platform.' : 'Your farms, fields and crops.'}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            New farm
          </Button>
        }
      />

      {farms.isPending && <LoadingState layout="page" label="Loading farms…" />}
      {farms.isError && <ErrorState error={farms.error} onRetry={() => farms.refetch()} />}
      {isEmpty && (
        <EmptyState
          icon={<IconPlant2 size={24} />}
          title="No farms yet"
          description="Create a farm, then add its fields and crops to start receiving irrigation recommendations."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Create your first farm
            </Button>
          }
        />
      )}

      {data && !isEmpty && (
        <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
          <Group p="md">
            <TextInput
              placeholder="Search by name or location"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              w={{ base: '100%', sm: 320 }}
            />
          </Group>
          <Table.ScrollContainer minWidth={720}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th ta="right">Area</Table.Th>
                  <Table.Th ta="right">Fields</Table.Th>
                  {isAdmin && <Table.Th>Owner</Table.Th>}
                  <Table.Th>Updated</Table.Th>
                  <Table.Th w={48} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.content.map((farm) => (
                  <Table.Tr
                    key={farm.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/farms/${farm.id}`)}
                  >
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/farms/${farm.id}`}
                        fw={600}
                        c="var(--mantine-color-text)"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {farm.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td c={farm.location ? undefined : 'dimmed'}>
                      {farm.location ?? '—'}
                    </Table.Td>
                    <Table.Td ta="right" className="app-num" style={{ whiteSpace: 'nowrap' }}>
                      {formatHectares(farm.areaHa)}
                    </Table.Td>
                    <Table.Td ta="right" className="app-num">
                      {farm.fieldCount}
                    </Table.Td>
                    {isAdmin && <Table.Td>{farm.owner.fullName}</Table.Td>}
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(farm.updatedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td onClick={(event) => event.stopPropagation()}>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={`Actions for ${farm.name}`}
                          >
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() => openEdit(farm)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => confirmDelete(farm)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {data.content.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={isAdmin ? 7 : 6}>
                      <Text c="dimmed" ta="center" py="md">
                        No farms match “{query}”.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {data.totalPages > 1 && (
            <Group justify="space-between" p="md">
              <Text size="sm" c="dimmed">
                {data.totalElements} farms
              </Text>
              <Pagination total={data.totalPages} value={page} onChange={setPage} size="sm" />
            </Group>
          )}
        </Card>
      )}

      <FarmFormModal
        opened={formOpened}
        onClose={form.close}
        farm={editing}
        onSaved={(saved) => !editing && navigate(`/farms/${saved.id}`)}
      />
    </>
  );
}
