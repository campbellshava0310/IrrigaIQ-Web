import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Group,
  Menu,
  SimpleGrid,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDots,
  IconGrid4x4,
  IconPencil,
  IconPlus,
  IconRuler2,
  IconTrash,
  IconUser,
  IconCalendar,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { StatCard } from '@/components/StatCard';
import { useAuth } from '@/features/auth/useAuth';
import { confirmDestructive } from '@/lib/confirm';
import { formatDate, formatHectares, formatMoney, formatNumber, humanize } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useDeleteFarm, useDeleteField, useFarm, useFields } from '../api';
import { FarmFormModal } from '../components/FarmFormModal';
import { FieldFormModal } from '../components/FieldFormModal';
import { useSyncCurrentFarm } from '../currentFarm';
import { IRRIGATION_METHOD_DEFAULTS, type Field } from '../types';

export function FarmDetailPage() {
  const { farmId = '' } = useParams();
  useSyncCurrentFarm(farmId);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const farm = useFarm(farmId);
  const fields = useFields(farmId);
  const deleteFarm = useDeleteFarm();
  const deleteField = useDeleteField(farmId);
  const [farmFormOpened, farmForm] = useDisclosure(false);
  const [fieldFormOpened, fieldForm] = useDisclosure(false);
  const [editingField, setEditingField] = useState<Field | undefined>();

  if (farm.isPending) {
    return <LoadingState layout="page" label="Loading farm…" />;
  }
  if (farm.isError) {
    return <ErrorState error={farm.error} onRetry={() => farm.refetch()} />;
  }

  const current = farm.data;
  const openFieldForm = (field?: Field) => {
    setEditingField(field);
    fieldForm.open();
  };
  const removeFarm = () =>
    confirmDestructive({
      title: `Delete ${current.name}?`,
      message:
        'This permanently removes the farm with its fields, crops, irrigation history, infrastructure and work orders.',
      onConfirm: () =>
        deleteFarm.mutate(current.id, {
          onSuccess: () => {
            notifySuccess(`${current.name} deleted`);
            navigate('/farms', { replace: true });
          },
          onError: (error) => notifyError(error, "Couldn't delete the farm"),
        }),
    });
  const removeField = (field: Field) =>
    confirmDestructive({
      title: `Delete ${field.name}?`,
      message: 'The field, its crops, irrigation log and soil checks will be removed.',
      onConfirm: () =>
        deleteField.mutate(field.id, {
          onSuccess: () => notifySuccess(`${field.name} deleted`),
          onError: (error) => notifyError(error, "Couldn't delete the field"),
        }),
    });

  return (
    <>
      <PageHeader
        back={{ to: '/farms', label: 'All farms' }}
        title={current.name}
        description={current.location ?? undefined}
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconPencil size={16} />}
              onClick={farmForm.open}
            >
              Edit
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={removeFarm}
            >
              Delete
            </Button>
          </>
        }
      />

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="xl">
        <StatCard
          label="Total area"
          value={formatHectares(current.areaHa)}
          icon={<IconRuler2 size={20} />}
        />
        <StatCard label="Fields" value={current.fieldCount} icon={<IconGrid4x4 size={20} />} />
        <StatCard
          label="Owner"
          value={
            <Text fz="lg" fw={600}>
              {current.owner.fullName}
            </Text>
          }
          icon={<IconUser size={20} />}
          hint={isAdmin ? current.owner.email : undefined}
        />
        <StatCard
          label="Created"
          value={
            <Text fz="lg" fw={600}>
              {formatDate(current.createdAt.slice(0, 10))}
            </Text>
          }
          icon={<IconCalendar size={20} />}
        />
      </SimpleGrid>

      <Card withBorder mb="xl">
        <Group justify="space-between" mb="xs">
          <Text fw={600}>Farm settings</Text>
          <Button
            size="compact-sm"
            variant="subtle"
            leftSection={<IconPencil size={14} />}
            onClick={farmForm.open}
          >
            Edit
          </Button>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <Setting
            label="Weather location"
            value={
              current.latitude != null && current.longitude != null
                ? `${current.latitude.toFixed(4)}, ${current.longitude.toFixed(4)}`
                : 'Not set: using field coordinates or an approximate location'
            }
          />
          <Setting label="Time zone" value={current.timezone} />
          <Setting
            label="Grid electricity"
            value={
              current.electricityTariff != null
                ? `${formatMoney(current.electricityTariff, current.currency)} per kWh`
                : 'No tariff set'
            }
          />
          <Setting
            label="Savings baseline"
            value={`${formatNumber(current.baselineDepthMm)} mm every ${current.baselineIntervalDays} days`}
          />
        </SimpleGrid>
      </Card>

      <Group justify="space-between" mb="sm">
        <Title order={3} fz="lg">
          Fields
        </Title>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => openFieldForm()}>
          Add field
        </Button>
      </Group>

      {fields.isPending && <LoadingState label="Loading fields…" />}
      {fields.isError && <ErrorState error={fields.error} onRetry={() => fields.refetch()} />}
      {fields.data?.length === 0 && (
        <EmptyState
          icon={<IconGrid4x4 size={24} />}
          title="No fields yet"
          description="Fields are the unit IrrigaIQ monitors and makes recommendations for. Add one per irrigation block."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={() => openFieldForm()}>
              Add the first field
            </Button>
          }
        />
      )}
      {fields.data && fields.data.length > 0 && (
        <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
          <Table.ScrollContainer minWidth={640}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Field</Table.Th>
                  <Table.Th ta="right">Area</Table.Th>
                  <Table.Th>Soil</Table.Th>
                  <Table.Th>Irrigation</Table.Th>
                  <Table.Th>Coordinates</Table.Th>
                  <Table.Th w={48} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {fields.data.map((field) => (
                  <Table.Tr key={field.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/farms/${farmId}/fields/${field.id}`} fw={600}>
                        {field.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right">{formatHectares(field.areaHa)}</Table.Td>
                    <Table.Td>{humanize(field.soilType)}</Table.Td>
                    <Table.Td>
                      {field.irrigationMethod
                        ? IRRIGATION_METHOD_DEFAULTS[field.irrigationMethod].label
                        : '—'}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" ff="monospace">
                        {field.latitude != null && field.longitude != null
                          ? `${field.latitude.toFixed(4)}, ${field.longitude.toFixed(4)}`
                          : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={`Actions for ${field.name}`}
                          >
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() => openFieldForm(field)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => removeField(field)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      <FarmFormModal opened={farmFormOpened} onClose={farmForm.close} farm={current} />
      <FieldFormModal
        opened={fieldFormOpened}
        onClose={fieldForm.close}
        farmId={farmId}
        field={editingField}
      />
    </>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </div>
  );
}
