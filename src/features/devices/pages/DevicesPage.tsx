import { ActionIcon, Badge, Button, Card, Group, Menu, Stack, Table, Text } from '@mantine/core';
import {
  IconChartLine,
  IconDots,
  IconEdit,
  IconKey,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRouter,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';

import { usePageCommand } from '@/app/command/usePageCommand';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { SortTh } from '@/components/table/SortTh';
import { useSort } from '@/components/table/useSort';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { confirmDestructive } from '@/lib/confirm';
import { formatRelative } from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useDeleteDevice, useDevices, useRotateDeviceKey, useUpdateDevice } from '../api';
import { DeviceFormModal } from '../components/DeviceFormModal';
import { DeviceKeyModal } from '../components/DeviceKeyModal';
import { DeviceReadingsDrawer } from '../components/DeviceReadingsDrawer';
import { SENSOR_TYPE, deviceState, latestSummary } from '../presentation';
import type { Device, IssuedKey } from '../types';

export function DevicesPage() {
  return <RequireFarm>{(farm) => <Devices farm={farm} />}</RequireFarm>;
}

function Devices({ farm }: { farm: Farm }) {
  const devices = useDevices(farm.id);
  const [command, clearCommand] = usePageCommand();
  const [editing, setEditing] = useState<Device | null>(null);
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [viewing, setViewing] = useState<Device | null>(null);
  const formOpened = creating || editing != null || command === 'register-device';

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    if (command) clearCommand();
  };

  return (
    <>
      <PageHeader
        title="Devices & sensors"
        description="Soil probes, water meters and pump monitors reporting from the field."
        help="Each device sends readings with its own key. Probe readings recalibrate a field's water balance, water meters are checked for leaks and unusual use, and pump monitors feed the failure-risk model."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            Register device
          </Button>
        }
      />
      {devices.isPending && <LoadingState layout="page" label="Loading devices…" />}
      {devices.isError && <ErrorState error={devices.error} onRetry={() => devices.refetch()} />}
      {devices.data && devices.data.length === 0 && (
        <EmptyState
          icon={<IconRouter size={22} />}
          title="No devices yet"
          description="Register an ESP32 soil probe, water meter or pump monitor. You get a key for it to send readings, and IrrigaIQ starts using its data straight away."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
              Register device
            </Button>
          }
        />
      )}
      {devices.data && devices.data.length > 0 && (
        <DeviceTable
          farmId={farm.id}
          devices={devices.data}
          onEdit={setEditing}
          onView={setViewing}
          onIssued={setIssued}
        />
      )}

      <DeviceFormModal
        opened={formOpened}
        onClose={closeForm}
        farmId={farm.id}
        device={editing ?? undefined}
        onRegistered={setIssued}
      />
      <DeviceKeyModal
        issued={issued}
        onClose={() => {
          if (issued) notifySuccess(`${issued.device.name} is ready to send readings`);
          setIssued(null);
        }}
      />
      <DeviceReadingsDrawer farmId={farm.id} device={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

function DeviceTable({
  farmId,
  devices,
  onEdit,
  onView,
  onIssued,
}: {
  farmId: string;
  devices: Device[];
  onEdit: (device: Device) => void;
  onView: (device: Device) => void;
  onIssued: (issued: IssuedKey) => void;
}) {
  const update = useUpdateDevice(farmId);
  const rotate = useRotateDeviceKey(farmId);
  const remove = useDeleteDevice(farmId);
  const { sorted, header } = useSort(devices, {
    name: (device) => device.name,
    type: (device) => SENSOR_TYPE[device.type].label,
    status: (device) => deviceState(device).label,
    seen: (device) => (device.lastSeenAt ? -new Date(device.lastSeenAt).getTime() : null),
  });

  const toggle = (device: Device) =>
    update.mutate(
      {
        id: device.id,
        input: {
          name: device.name === device.deviceId ? null : device.name,
          fieldId: device.fieldId,
          assetId: device.assetId,
          fieldCapacityPct: device.fieldCapacityPct,
          wiltingPointPct: device.wiltingPointPct,
          status: device.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
        },
      },
      { onError: (error) => notifyError(error, "Couldn't change the device") },
    );

  const rotateKey = (device: Device) =>
    confirmDestructive({
      title: `New key for ${device.name}?`,
      message:
        'The current key stops working at once. The device sends nothing until it has the new key.',
      confirmLabel: 'Issue new key',
      onConfirm: () =>
        rotate.mutate(device.id, {
          onSuccess: onIssued,
          onError: (error) => notifyError(error, "Couldn't issue a new key"),
        }),
    });

  const deleteDevice = (device: Device) =>
    confirmDestructive({
      title: `Delete ${device.name}?`,
      message: 'Its key stops working and all of its readings are deleted.',
      onConfirm: () =>
        remove.mutate(device.id, {
          onSuccess: () => notifySuccess(`${device.name} deleted`),
          onError: (error) => notifyError(error, "Couldn't delete the device"),
        }),
    });

  return (
    <Card withBorder padding={0} className="app-table-card">
      <div className="app-table-scroll">
        <Table highlightOnHover stickyHeader miw={900}>
          <Table.Thead>
            <Table.Tr>
              <SortTh sort={header('name')} w={260}>
                Device
              </SortTh>
              <SortTh sort={header('type')}>Type</SortTh>
              <Table.Th>Placed on</Table.Th>
              <SortTh sort={header('status')}>Status</SortTh>
              <Table.Th>Latest reading</Table.Th>
              <SortTh sort={header('seen')}>Last seen</SortTh>
              <Table.Th>Key</Table.Th>
              <Table.Th w={56}>
                <span className="app-visually-hidden">Actions</span>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((device) => {
              const state = deviceState(device);
              const TypeIcon = SENSOR_TYPE[device.type].icon;
              return (
                <Table.Tr key={device.id}>
                  <Table.Td maw={260}>
                    <Group gap={10} wrap="nowrap">
                      <TypeIcon
                        size={18}
                        stroke={1.7}
                        color="var(--app-text-muted)"
                        style={{ flexShrink: 0 }}
                      />
                      <Stack gap={0} miw={0}>
                        <Text size="sm" fw={600} truncate>
                          {device.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate ff="monospace">
                          {device.deviceId}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{SENSOR_TYPE[device.type].label}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{device.assetName ?? device.fieldName ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="dot" color={state.color}>
                      {state.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" className="app-num">
                      {latestSummary(device)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {device.lastSeenAt ? formatRelative(device.lastSeenAt) : 'Never'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace" c="dimmed">
                      {device.keyPrefix ? `iqd_${device.keyPrefix}_…` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`Actions for ${device.name}`}
                        >
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconChartLine size={14} />}
                          onClick={() => onView(device)}
                        >
                          Readings
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => onEdit(device)}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconKey size={14} />}
                          onClick={() => rotateKey(device)}
                        >
                          Issue a new key
                        </Menu.Item>
                        <Menu.Item
                          leftSection={
                            device.status === 'ACTIVE' ? (
                              <IconPlayerPause size={14} />
                            ) : (
                              <IconPlayerPlay size={14} />
                            )
                          }
                          onClick={() => toggle(device)}
                        >
                          {device.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => deleteDevice(device)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    </Card>
  );
}
