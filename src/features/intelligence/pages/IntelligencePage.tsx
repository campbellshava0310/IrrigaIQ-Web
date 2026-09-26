import {
  Anchor,
  Badge,
  Box,
  Card,
  Grid,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAntennaBars5,
  IconBrain,
  IconCircleCheck,
  IconClipboardCheck,
  IconCloudRain,
  IconDroplet,
  IconEngine,
  IconEye,
  IconLeaf,
  IconShovel,
  IconSparkles,
  IconAlertTriangle,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryStates';
import { useBriefing, useWeather } from '@/features/dashboard/api';
import type { BriefingItem, BriefingSection, Tone } from '@/features/dashboard/types';
import { RequireFarm } from '@/features/farms/components/RequireFarm';
import type { Farm } from '@/features/farms/types';
import { useAssets } from '@/features/infrastructure/api';
import { useIrrigationStatus } from '@/features/irrigation/api';
import { formatDayLabel, formatRelative } from '@/lib/format';

const TONE: Record<Tone, { label: string; color: string; icon: Icon }> = {
  ACTION: { label: 'Act today', color: 'orange', icon: IconAlertTriangle },
  WATCH: { label: 'Keep an eye on', color: 'yellow', icon: IconEye },
  GOOD: { label: 'All good', color: 'teal', icon: IconCircleCheck },
};

const SECTION_ICON: Record<string, Icon> = {
  irrigation: IconDroplet,
  weather: IconCloudRain,
  water: IconDroplet,
  infrastructure: IconEngine,
  yield: IconLeaf,
};

export function IntelligencePage() {
  return <RequireFarm>{(farm) => <Intelligence farm={farm} />}</RequireFarm>;
}

function Intelligence({ farm }: { farm: Farm }) {
  const briefing = useBriefing(farm.id);

  return (
    <>
      <PageHeader
        title="Farm intelligence"
        description="A plain-language briefing of what matters today across water, crops and infrastructure, and exactly how each recommendation is worked out."
      />
      {briefing.isPending && <LoadingState layout="page" label="Writing today's briefing…" />}
      {briefing.isError && <ErrorState error={briefing.error} onRetry={() => briefing.refetch()} />}
      {briefing.data && (
        <Stack gap="lg">
          <Box className="app-hero" p={{ base: 'lg', sm: 32 }}>
            <Group gap={8} mb="md" wrap="wrap">
              <Group gap={6} className="app-glass-pill" wrap="nowrap">
                <IconSparkles size={14} />
                <Text size="xs" fw={600}>
                  Today&apos;s briefing
                </Text>
              </Group>
              <Text size="sm" opacity={0.8}>
                {briefing.data.farmName} · {formatDayLabel(briefing.data.date)} · generated{' '}
                {formatRelative(briefing.data.generatedAt)}
              </Text>
            </Group>
            <Title order={2} c="white" fz={{ base: 22, sm: 28 }} lts={-0.6} lh={1.25} maw={820}>
              {briefing.data.headline}
            </Title>
          </Box>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {briefing.data.sections.map((section) => (
              <SectionCard key={section.key} section={section} farmId={farm.id} />
            ))}
          </SimpleGrid>

          <Text size="xs" c="dimmed">
            {briefing.data.disclaimer}
          </Text>

          <HowItWorks farm={farm} />
        </Stack>
      )}
    </>
  );
}

function SectionCard({ section, farmId }: { section: BriefingSection; farmId: string }) {
  const tone = TONE[section.tone];
  const SectionIcon = SECTION_ICON[section.key] ?? IconSparkles;
  return (
    <Card withBorder>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap={10} wrap="nowrap">
          <ThemeIcon variant="light" color={tone.color} size={28} radius="sm">
            <SectionIcon size={16} />
          </ThemeIcon>
          <Text fw={650} fz="lg">
            {section.title}
          </Text>
        </Group>
        <Badge variant="dot" color={tone.color}>
          {tone.label}
        </Badge>
      </Group>
      <Stack gap={10}>
        {section.items.map((item, index) => (
          <ItemLine key={`${section.key}-${index}`} item={item} farmId={farmId} />
        ))}
      </Stack>
    </Card>
  );
}

function ItemLine({ item, farmId }: { item: BriefingItem; farmId: string }) {
  const tone = TONE[item.tone];
  const to =
    item.linkType === 'FIELD' && item.linkId
      ? `/farms/${farmId}/fields/${item.linkId}`
      : item.linkType === 'ASSET' && item.linkId
        ? `/farms/${farmId}/assets/${item.linkId}`
        : null;
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <ThemeIcon
        size={18}
        radius="xl"
        variant="light"
        color={tone.color}
        mt={2}
        aria-label={tone.label}
      >
        <tone.icon size={11} />
      </ThemeIcon>
      <Text size="sm" style={{ flex: 1 }}>
        {item.text}{' '}
        {to && (
          <Anchor component={Link} to={to} size="sm">
            Open
          </Anchor>
        )}
      </Text>
    </Group>
  );
}

/**
 * Model cards: what each recommendation is based on today, how confident it is on this farm, and
 * what sensors and trained models will add. Trust comes from showing the working.
 */
function HowItWorks({ farm }: { farm: Farm }) {
  const status = useIrrigationStatus(farm.id);
  const assets = useAssets(farm.id);
  const weather = useWeather(farm.id, 0, 7);

  const planted = (status.data ?? []).filter((field) => field.cropType != null);
  const lowConfidence = planted.filter((field) => field.recommendation.confidence === 'LOW').length;
  const unconfigured = planted.filter((field) => !field.systemConfigured).length;
  const staleAssets = (assets.data ?? []).filter((asset) =>
    asset.health?.factors.some(
      (factor) => factor.code === 'NO_CONDITION_DATA' || factor.code === 'STALE_CONDITION_DATA',
    ),
  ).length;
  const noPlan = (assets.data ?? []).filter((asset) =>
    asset.health?.factors.some((factor) => factor.code === 'NO_SERVICE_PLAN'),
  ).length;

  const improvements: { icon: Icon; text: string; to: string }[] = [];
  if (weather.data && !weather.data.live) {
    improvements.push({
      icon: IconCloudRain,
      text: weather.data.locationApproximate
        ? 'Add the farm latitude and longitude so the forecast is for your farm.'
        : 'The live forecast is unreachable, so seasonal averages are in use. It reconnects automatically.',
      to: `/farms/${farm.id}`,
    });
  }
  if (lowConfidence > 0) {
    improvements.push({
      icon: IconShovel,
      text: `${lowConfidence} of ${planted.length} fields have low-confidence recommendations. A soil check on each resets the model to reality.`,
      to: '/irrigation',
    });
  }
  if (unconfigured > 0) {
    improvements.push({
      icon: IconDroplet,
      text: `${unconfigured} fields use a default irrigation system. Set the method, application rate and pump for accurate run times.`,
      to: '/irrigation',
    });
  }
  if (staleAssets > 0) {
    improvements.push({
      icon: IconClipboardCheck,
      text: `${staleAssets} assets have no condition check in the last 60 days. Monthly checks are what make early warnings possible.`,
      to: '/infrastructure',
    });
  }
  if (noPlan > 0) {
    improvements.push({
      icon: IconEngine,
      text: `${noPlan} assets have no service interval, so no service can be forecast for them.`,
      to: '/infrastructure',
    });
  }

  return (
    <Stack gap="md" mt="xl">
      <div>
        <Title order={2} fz="xl" lts={-0.3}>
          How IrrigaIQ decides
        </Title>
        <Text c="dimmed" size="sm" mt={4}>
          What each recommendation is based on today, and what sensors and trained models will add.
        </Text>
      </div>
      <Grid gap="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <ModelCard
              icon={IconDroplet}
              title="Irrigation scheduling"
              method="FAO-56 soil water balance · fao56-1"
              today={[
                'Daily reference evapotranspiration (ET₀) and rain from the Open-Meteo forecast',
                'Crop coefficient curve and rooting depth by crop and days since planting',
                'Soil available water by texture; your irrigation log and soil checks',
                'Schedules runs inside each pump’s solar or load-shedding-free window',
              ]}
              next="Soil-moisture probes replace modelled depletion with measurements, and a model trained on your fields learns their real crop water use and drainage."
            />
            <ModelCard
              icon={IconEngine}
              title="Infrastructure health"
              method="Maintenance rules · rules-1"
              today={[
                'Service intervals by calendar and run-hours, forecast from recent use',
                'Pump energy per m³ against its baseline, the earliest sign of wear',
                'Vibration, leaks, filter differential pressure and water level from inspections',
                'Age against design life and repairs still open',
              ]}
              next="Flow, pressure and motor-current sensors feed anomaly detection and a remaining-useful-life model that predicts failures weeks earlier."
            />
          </SimpleGrid>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card withBorder h="100%">
            <Group gap={10} mb="md" wrap="nowrap">
              <ThemeIcon variant="light" size={28} radius="sm">
                <IconAntennaBars5 size={16} />
              </ThemeIcon>
              <Text fw={650}>Improve accuracy on this farm</Text>
            </Group>
            {improvements.length === 0 ? (
              <Text size="sm" c="dimmed">
                Live weather, configured systems, recent soil and condition checks: recommendations
                here are running on the best data available without sensors.
              </Text>
            ) : (
              <Stack gap="sm">
                {improvements.map((item) => (
                  <Group key={item.text} gap="xs" wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="light" size="sm" radius="md" mt={2}>
                      <item.icon size={14} />
                    </ThemeIcon>
                    <Text size="sm" style={{ flex: 1 }}>
                      {item.text}{' '}
                      <Anchor component={Link} to={item.to} size="sm">
                        Fix
                      </Anchor>
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function ModelCard({
  icon: CardIcon,
  title,
  method,
  today,
  next,
}: {
  icon: Icon;
  title: string;
  method: string;
  today: string[];
  next: string;
}) {
  return (
    <Card withBorder h="100%">
      <Group gap={10} mb={10} wrap="nowrap">
        <ThemeIcon variant="light" size={28} radius="sm">
          <CardIcon size={16} />
        </ThemeIcon>
        <Text fw={650}>{title}</Text>
      </Group>
      <Badge variant="light" color="gray" mb="md" radius="sm" ff="monospace" fw={500}>
        {method}
      </Badge>
      <Text size="sm" fw={600} mb={6}>
        Uses today
      </Text>
      <List size="sm" spacing={6} mb="lg" c="dimmed">
        {today.map((line) => (
          <List.Item key={line}>{line}</List.Item>
        ))}
      </List>
      <Group gap={6} mb={6}>
        <IconBrain size={16} color="var(--mantine-color-violet-filled)" />
        <Text size="sm" fw={600}>
          With sensors and AI
        </Text>
      </Group>
      <Text size="sm" c="dimmed">
        {next}
      </Text>
    </Card>
  );
}
