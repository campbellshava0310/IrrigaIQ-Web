import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustments,
  IconDots,
  IconInfoCircle,
  IconLeaf,
  IconPencil,
  IconPlus,
  IconShovel,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useParams } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import {
  useIrrigationEvents,
  useSoilObservations,
  useWaterBalance,
} from '@/features/irrigation/api';
import { CompleteIrrigationModal } from '@/features/irrigation/components/CompleteIrrigationModal';
import { EventsTable } from '@/features/irrigation/components/EventsTable';
import { FieldRecommendationCard } from '@/features/irrigation/components/FieldRecommendationCard';
import { IrrigationSetupModal } from '@/features/irrigation/components/IrrigationSetupModal';
import { LogIrrigationModal } from '@/features/irrigation/components/LogIrrigationModal';
import { SoilCheckModal } from '@/features/irrigation/components/SoilCheckModal';
import { WaterBalanceCharts } from '@/features/irrigation/components/WaterBalanceCharts';
import { OBSERVATION_METHOD, PHASE_LABEL } from '@/features/irrigation/presentation';
import type { IrrigationEvent, Season, IrrigationSetup } from '@/features/irrigation/types';
import { useIrrigationActions } from '@/features/irrigation/useIrrigationActions';
import { confirmDestructive } from '@/lib/confirm';
import {
  addDays,
  formatDate,
  formatDepth,
  formatHectares,
  formatNumber,
  formatPercent,
  formatRelative,
  humanize,
  toIsoDate,
} from '@/lib/format';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useCrops, useDeleteCrop, useFarm, useField } from '../api';
import { CropFormModal } from '../components/CropFormModal';
import { FieldFormModal } from '../components/FieldFormModal';
import { useSyncCurrentFarm } from '../currentFarm';
import { GROWTH_STAGE_LABELS, IRRIGATION_METHOD_DEFAULTS, type Crop } from '../types';

export function FieldDetailPage() {
  const { farmId = '', fieldId = '' } = useParams();
  useSyncCurrentFarm(farmId);
  const farm = useFarm(farmId);
  const field = useField(farmId, fieldId);
  const [historyDays, setHistoryDays] = useState('30');
  const balance = useWaterBalance(farmId, fieldId, Number(historyDays));
  const actions = useIrrigationActions(farmId);
  const [fieldFormOpened, fieldForm] = useDisclosure(false);
  const [soilOpened, soil] = useDisclosure(false);
  const [setupOpened, setup] = useDisclosure(false);
  const [logMode, setLogMode] = useState<'COMPLETED' | 'PLANNED' | null>(null);
  const [confirming, setConfirming] = useState<IrrigationEvent | null>(null);

  if (field.isPending) {
    return <LoadingState layout="page" label="Loading field…" />;
  }
  if (field.isError) {
    return <ErrorState error={field.error} onRetry={() => field.refetch()} />;
  }

  const current = field.data;
  const status = balance.data?.status;
  const planted = status && status.cropType != null;

  return (
    <>
      <PageHeader
        back={{ to: `/farms/${farmId}`, label: farm.data?.name ?? 'Farm' }}
        title={current.name}
        description={[
          formatHectares(current.areaHa),
          current.soilType ? `${humanize(current.soilType)} soil` : 'Soil type not set',
          current.irrigationMethod
            ? IRRIGATION_METHOD_DEFAULTS[current.irrigationMethod].label
            : 'Irrigation system not set',
        ].join(' · ')}
        actions={
          <>
            <Button variant="default" leftSection={<IconShovel size={16} />} onClick={soil.open}>
              Soil check
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setLogMode('COMPLETED')}>
              Log irrigation
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label="More field actions">
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPencil size={14} />} onClick={fieldForm.open}>
                  Edit field
                </Menu.Item>
                <Menu.Item leftSection={<IconAdjustments size={14} />} onClick={setup.open}>
                  Irrigation system
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setLogMode('PLANNED')}
                >
                  Plan an irrigation
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />

      {balance.isPending && <LoadingState label="Running the water balance…" />}
      {balance.isError && <ErrorState error={balance.error} onRetry={() => balance.refetch()} />}

      {balance.data && status && (
        <>
          {balance.data.locationApproximate && (
            <Alert color="yellow" variant="light" icon={<IconInfoCircle size={18} />} mb="lg">
              This farm has no coordinates, so the weather is for an approximate location. Add the
              farm or field latitude and longitude for a local forecast.
            </Alert>
          )}
          <Grid gap="lg" mb="xl">
            <Grid.Col span={{ base: 12, lg: 5 }}>
              <FieldRecommendationCard
                farmId={farmId}
                field={status}
                planning={actions.planningFieldId === fieldId}
                onPlan={() => actions.planRecommended(fieldId)}
                onLog={() => setLogMode('COMPLETED')}
                onSoilCheck={soil.open}
                onSetup={setup.open}
                onConfirm={setConfirming}
                onSkip={actions.skipEvent}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Stack gap="lg">
                {balance.data.season ? (
                  <SeasonCard season={balance.data.season} />
                ) : (
                  <Card withBorder>
                    <Text fw={600}>No active season</Text>
                    <Text size="sm" c="dimmed">
                      Add the crop and its planting date below to start the water balance.
                    </Text>
                  </Card>
                )}
                <SetupCard setup={balance.data.setup} onEdit={setup.open} />
              </Stack>
            </Grid.Col>
          </Grid>

          {planted && (
            <Stack gap="sm" mb="xl">
              <Title order={2}>Water balance</Title>
              <WaterBalanceCharts
                days={balance.data.days}
                today={balance.data.today}
                refreshing={balance.isPlaceholderData}
                toolbar={
                  <SegmentedControl
                    size="xs"
                    value={historyDays}
                    onChange={setHistoryDays}
                    data={[
                      { value: '30', label: 'Last 30 days' },
                      { value: '60', label: '60 days' },
                      { value: '90', label: '90 days' },
                    ]}
                    aria-label="History range"
                  />
                }
              />
            </Stack>
          )}
        </>
      )}

      <Stack gap="lg" mb="xl">
        <FieldIrrigationLog
          farmId={farmId}
          fieldId={fieldId}
          onConfirm={setConfirming}
          onSkip={actions.skipEvent}
          onDelete={actions.deleteEvent}
        />
        <SoilChecks farmId={farmId} fieldId={fieldId} onAdd={soil.open} />
      </Stack>

      <CropsSection farmId={farmId} fieldId={fieldId} />

      <FieldFormModal
        opened={fieldFormOpened}
        onClose={fieldForm.close}
        farmId={farmId}
        field={current}
      />
      <SoilCheckModal
        opened={soilOpened}
        onClose={soil.close}
        farmId={farmId}
        fieldId={fieldId}
        fieldName={current.name}
      />
      <IrrigationSetupModal
        opened={setupOpened}
        onClose={setup.close}
        farmId={farmId}
        fieldId={fieldId}
        fieldName={current.name}
      />
      <LogIrrigationModal
        opened={logMode != null}
        onClose={() => setLogMode(null)}
        farmId={farmId}
        fields={[{ id: fieldId, name: current.name }]}
        fieldId={fieldId}
        mode={logMode ?? 'COMPLETED'}
      />
      <CompleteIrrigationModal
        event={confirming}
        onClose={() => setConfirming(null)}
        farmId={farmId}
      />
    </>
  );
}

function SeasonCard({ season }: { season: Season }) {
  const progress = Math.min(100, (season.daysAfterPlanting / season.seasonLengthDays) * 100);
  const yieldColor =
    season.yieldReductionPct >= 10 ? 'red' : season.yieldReductionPct >= 3 ? 'orange' : 'green';
  return (
    <Card withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Season to date</Text>
        <Badge variant="light">{PHASE_LABEL[season.phase]}</Badge>
      </Group>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">
          Day {season.daysAfterPlanting} of {season.seasonLengthDays}
        </Text>
        <Text size="xs" c="dimmed">
          Crop coefficient Kc {formatNumber(season.kc, 2)}
        </Text>
      </Group>
      <Progress value={progress} size="sm" mb="md" aria-label="Season progress" />
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Figure
          label="Crop water need"
          value={formatDepth(season.etcMm)}
          hint="ETc since planting"
        />
        <Figure
          label="Water the crop got"
          value={formatPercent(season.relativeEtPct)}
          hint={`${formatDepth(season.etaMm)} actual use`}
        />
        <Figure label="Irrigation" value={formatDepth(season.irrigationMm)} hint="Gross applied" />
        <Figure
          label="Useful rain"
          value={formatDepth(season.effectiveRainMm)}
          hint="After runoff losses"
        />
      </SimpleGrid>
      <Card withBorder radius="md" padding="sm" mt="md" bg="var(--app-surface-muted)">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Expected yield
            </Text>
            <Text fw={600} fz="md">
              {formatNumber(season.expectedYieldTHa, 1)} t/ha
              <Text span size="sm" c="dimmed" fw={400}>
                {' '}
                of {formatNumber(season.attainableYieldTHa, 1)} attainable
              </Text>
            </Text>
          </Stack>
          <Tooltip
            label="FAO-33 yield response: yield falls in proportion to the water the crop could not use (Ky × (1 − ETa/ETc))."
            multiline
            w={280}
          >
            <Badge color={yieldColor} variant="dot" size="lg">
              {season.yieldReductionPct < 0.5
                ? 'No yield lost'
                : `${formatPercent(season.yieldReductionPct, 1)} lost · ${season.stressDays} stress days`}
            </Badge>
          </Tooltip>
        </Group>
      </Card>
    </Card>
  );
}

function SetupCard({ setup, onEdit }: { setup: IrrigationSetup; onEdit: () => void }) {
  const defaulted =
    setup.methodDefaulted ||
    setup.rateDefaulted ||
    setup.efficiencyDefaulted ||
    setup.soilDefaulted;
  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Text fw={600}>What the model assumes</Text>
        <Button
          size="compact-sm"
          variant="subtle"
          leftSection={<IconAdjustments size={14} />}
          onClick={onEdit}
        >
          Adjust
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        <Figure
          label="Method"
          value={IRRIGATION_METHOD_DEFAULTS[setup.method].label}
          hint={setup.methodDefaulted ? 'Assumed' : undefined}
        />
        <Figure
          label="Application rate"
          value={`${formatNumber(setup.applicationRateMmH, 1)} mm/h`}
          hint={setup.rateDefaulted ? 'Typical value' : 'Measured'}
        />
        <Figure
          label="Efficiency"
          value={formatPercent(setup.efficiency * 100)}
          hint={setup.efficiencyDefaulted ? 'Typical value' : 'Set for this field'}
        />
        <Figure
          label="Soil"
          value={humanize(setup.soilType)}
          hint={
            setup.soilDefaulted
              ? 'Assumed loam'
              : `${formatNumber(setup.availableWaterMmPerM)} mm/m available`
          }
        />
        <Figure
          label="Pump"
          value={setup.pump?.name ?? 'Not linked'}
          hint={setup.pump?.powerSource ? humanize(setup.pump.powerSource) : undefined}
        />
      </SimpleGrid>
      {defaulted && (
        <Text size="xs" c="dimmed" mt="md">
          Values marked typical or assumed come from FAO guidance for the method and soil. Replacing
          them with measured values makes run times and volumes more accurate.
        </Text>
      )}
    </Card>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

function FieldIrrigationLog({
  farmId,
  fieldId,
  onConfirm,
  onSkip,
  onDelete,
}: {
  farmId: string;
  fieldId: string;
  onConfirm: (event: IrrigationEvent) => void;
  onSkip: (event: IrrigationEvent) => void;
  onDelete: (event: IrrigationEvent) => void;
}) {
  const today = new Date();
  const events = useIrrigationEvents(farmId, {
    from: toIsoDate(addDays(today, -30)),
    to: toIsoDate(addDays(today, 14)),
    fieldId,
  });
  const sorted = [...(events.data ?? [])].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <Card withBorder padding={0} className="app-table-card">
      <Group justify="space-between" p="md" pb="xs">
        <Text fw={600}>Irrigation log</Text>
        <Text size="xs" c="dimmed">
          Last 30 days and upcoming
        </Text>
      </Group>
      {events.isPending && <LoadingState />}
      {events.isError && <ErrorState error={events.error} onRetry={() => events.refetch()} />}
      {events.data && sorted.length === 0 && (
        <Text size="sm" c="dimmed" p="md" pt={0}>
          No irrigation recorded. Log each run (or confirm planned runs) so the water balance stays
          true.
        </Text>
      )}
      {sorted.length > 0 && (
        <EventsTable
          events={sorted}
          showField={false}
          onConfirm={onConfirm}
          onSkip={onSkip}
          onDelete={onDelete}
        />
      )}
    </Card>
  );
}

function SoilChecks({
  farmId,
  fieldId,
  onAdd,
}: {
  farmId: string;
  fieldId: string;
  onAdd: () => void;
}) {
  const observations = useSoilObservations(farmId, fieldId);
  return (
    <Card withBorder padding={0} className="app-table-card">
      <Group justify="space-between" p="md" pb="xs">
        <Text fw={600}>Soil checks</Text>
        <Button
          size="compact-sm"
          variant="subtle"
          leftSection={<IconPlus size={14} />}
          onClick={onAdd}
        >
          Add
        </Button>
      </Group>
      {observations.isPending && <LoadingState />}
      {observations.isError && (
        <ErrorState error={observations.error} onRetry={() => observations.refetch()} />
      )}
      {observations.data?.length === 0 && (
        <Text size="sm" c="dimmed" p="md" pt={0}>
          No soil checks yet. A weekly squeeze test keeps the model honest: each check resets the
          modelled soil water to what you measured.
        </Text>
      )}
      {observations.data && observations.data.length > 0 && (
        <div className="app-table-scroll">
          <Table stickyHeader miw={420} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th ta="right">Soil water</Table.Th>
                <Table.Th>Method</Table.Th>
                <Table.Th>Notes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {observations.data.slice(0, 10).map((observation) => (
                <Table.Tr key={observation.id}>
                  <Table.Td>{formatRelative(observation.observedAt)}</Table.Td>
                  <Table.Td ta="right">{formatPercent(100 - observation.depletionPct)}</Table.Td>
                  <Table.Td>{OBSERVATION_METHOD[observation.method]}</Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {observation.notes ?? ''}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function CropsSection({ farmId, fieldId }: { farmId: string; fieldId: string }) {
  const crops = useCrops(farmId, fieldId);
  const deleteCrop = useDeleteCrop(farmId, fieldId);
  const [cropFormOpened, cropForm] = useDisclosure(false);
  const [editingCrop, setEditingCrop] = useState<Crop | undefined>();

  const openCropForm = (crop?: Crop) => {
    setEditingCrop(crop);
    cropForm.open();
  };
  const removeCrop = (crop: Crop) =>
    confirmDestructive({
      title: `Remove ${humanize(crop.cropType)}?`,
      message: 'The crop record will be deleted from this field.',
      confirmLabel: 'Remove',
      onConfirm: () =>
        deleteCrop.mutate(crop.id, {
          onSuccess: () => notifySuccess('Crop removed'),
          onError: (error) => notifyError(error, "Couldn't remove the crop"),
        }),
    });

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Title order={2}>Crops</Title>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => openCropForm()}>
          Add crop
        </Button>
      </Group>
      {crops.isPending && <LoadingState label="Loading crops…" />}
      {crops.isError && <ErrorState error={crops.error} onRetry={() => crops.refetch()} />}
      {crops.data?.length === 0 && (
        <EmptyState
          icon={<IconLeaf size={24} />}
          title="No crops recorded"
          description="The crop and its planting date set the crop coefficient, rooting depth and season length the water balance uses."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={() => openCropForm()}>
              Add a crop
            </Button>
          }
        />
      )}
      {crops.data && crops.data.length > 0 && (
        <Card withBorder padding={0} className="app-table-card">
          <div className="app-table-scroll">
            <Table stickyHeader miw={640} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Crop</Table.Th>
                  <Table.Th>Variety</Table.Th>
                  <Table.Th>Planted</Table.Th>
                  <Table.Th>Growth stage</Table.Th>
                  <Table.Th ta="right">Target yield</Table.Th>
                  <Table.Th w={48}>
                    <span className="app-visually-hidden">Actions</span>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {crops.data.map((crop) => (
                  <Table.Tr key={crop.id}>
                    <Table.Td fw={600}>{humanize(crop.cropType)}</Table.Td>
                    <Table.Td>{crop.variety ?? '—'}</Table.Td>
                    <Table.Td>{formatDate(crop.plantingDate)}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{GROWTH_STAGE_LABELS[crop.growthStage]}</Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      {crop.expectedYieldTHa != null
                        ? `${formatNumber(crop.expectedYieldTHa, 1)} t/ha`
                        : 'Typical'}
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" aria-label="Crop actions">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() => openCropForm(crop)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => removeCrop(crop)}
                          >
                            Remove
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </Card>
      )}
      <CropFormModal
        opened={cropFormOpened}
        onClose={cropForm.close}
        farmId={farmId}
        fieldId={fieldId}
        crop={editingCrop}
      />
    </>
  );
}
