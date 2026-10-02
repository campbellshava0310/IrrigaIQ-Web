import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  List,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustments,
  IconCalendarPlus,
  IconChartLine,
  IconCheck,
  IconChevronDown,
  IconDots,
  IconHandStop,
  IconPlus,
  IconShovel,
  IconSun,
} from '@tabler/icons-react';
import { Link } from 'react-router';

import { IRRIGATION_METHOD_DEFAULTS } from '@/features/farms/types';
import { ModelOpinion } from '@/features/ml/components/ModelOpinion';
import type { FieldAssessment } from '@/features/ml/types';
import {
  formatClock,
  formatDepth,
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelative,
  formatVolume,
  formatWhen,
  humanize,
} from '@/lib/format';

import {
  CONFIDENCE,
  DECISION,
  PHASE_LABEL,
  WATER_STATUS,
  decisionHeadline,
  wantsWater,
} from '../presentation';
import type { FieldStatus, IrrigationEvent } from '../types';

import { SoilWaterMeter } from './SoilWaterMeter';

interface FieldRecommendationCardProps {
  farmId: string;
  field: FieldStatus;
  /** The irrigation-need model's view of this field, when the ML service answered. */
  model?: { assessment: FieldAssessment | undefined; available: boolean };
  planning: boolean;
  onPlan: (field: FieldStatus) => void;
  onLog: (field: FieldStatus) => void;
  onSoilCheck: (field: FieldStatus) => void;
  onSetup: (field: FieldStatus) => void;
  onConfirm: (event: IrrigationEvent) => void;
  onSkip: (event: IrrigationEvent) => void;
}

export function FieldRecommendationCard({
  farmId,
  field,
  model,
  planning,
  onPlan,
  onLog,
  onSoilCheck,
  onSetup,
  onConfirm,
  onSkip,
}: FieldRecommendationCardProps) {
  const [reasonsOpened, reasons] = useDisclosure(false);
  const rec = field.recommendation;
  const status = WATER_STATUS[rec.status];
  const decision = DECISION[rec.decision];
  const planted = rec.status !== 'NOT_PLANTED' && rec.status !== 'SEASON_ENDED';
  const showAmounts = planted && rec.volumeM3 > 0 && rec.decision !== 'HOLD_FOR_RAIN';
  const next = field.nextPlanned;
  const solar = field.pump?.powerSource === 'SOLAR';

  const subtitle = [
    field.cropType ? humanize(field.cropType) : null,
    field.variety,
    field.phase ? PHASE_LABEL[field.phase] : null,
    field.daysAfterPlanting != null && field.seasonLengthDays
      ? `day ${field.daysAfterPlanting} of ${field.seasonLengthDays}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} miw={0}>
            <Anchor
              component={Link}
              to={`/farms/${farmId}/fields/${field.fieldId}`}
              fw={600}
              fz="md"
              c="var(--mantine-color-text)"
              truncate
            >
              {field.fieldName}
            </Anchor>
            <Text size="sm" c="dimmed">
              {subtitle || 'No crop recorded'}
            </Text>
            <Text size="xs" c="dimmed">
              {formatNumber(field.areaHa, 2)} ha ·{' '}
              {field.irrigationMethod
                ? IRRIGATION_METHOD_DEFAULTS[field.irrigationMethod].label
                : 'Irrigation system not set'}
              {field.pump ? ` · ${field.pump.name}` : ''}
            </Text>
          </Stack>
          <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Badge color={status.color} variant="dot">
              {status.label}
            </Badge>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`More actions for ${field.fieldName}`}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => onLog(field)}>
                  Log an irrigation
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconShovel size={14} />}
                  onClick={() => onSoilCheck(field)}
                >
                  Record a soil check
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconAdjustments size={14} />}
                  onClick={() => onSetup(field)}
                >
                  Irrigation system
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  component={Link}
                  to={`/farms/${farmId}/fields/${field.fieldId}`}
                  leftSection={<IconChartLine size={14} />}
                >
                  Water balance & history
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <SoilWaterMeter
          depletionPct={field.depletionPct}
          stressThresholdPct={field.stressThresholdPct}
          status={rec.status}
        />

        <Paper
          p="md"
          bg="var(--app-surface-muted)"
          style={{ border: '1px solid var(--app-border)' }}
        >
          <Stack gap="sm">
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon color={decision.color} variant="light" size={28} radius="sm">
                <decision.icon size={16} />
              </ThemeIcon>
              <Text fw={600}>{decisionHeadline(rec)}</Text>
            </Group>

            {!planted && (
              <Text size="sm" c="dimmed">
                {status.description}{' '}
                <Anchor component={Link} to={`/farms/${farmId}/fields/${field.fieldId}`} size="sm">
                  Open field
                </Anchor>
              </Text>
            )}

            {rec.decision === 'HOLD_FOR_RAIN' && (
              <Text size="sm">
                About <b>{formatDepth(rec.expectedRainMm)}</b> of effective rain is expected in the
                next 48 hours: enough to cover most of the deficit. Check again tomorrow.
              </Text>
            )}

            {showAmounts && (
              <>
                <SimpleGrid cols={3} spacing="xs">
                  <Metric label="Apply" value={formatDepth(rec.grossDepthMm)} />
                  <Metric label="Volume" value={formatVolume(rec.volumeM3)} />
                  <Metric label="Run time" value={formatDuration(rec.durationMinutes)} />
                </SimpleGrid>
                <Text size="sm">
                  Start <b>{formatClock(rec.schedule.startTime)}</b> ·{' '}
                  {rec.schedule.windowLabel.toLowerCase()}
                  {rec.schedule.sessions > 1 &&
                    ` · ${rec.schedule.sessions} runs of ${formatDuration(rec.schedule.sessionMinutes)}`}
                </Text>
                {(rec.energyKwh != null || solar) && (
                  <Group gap={6}>
                    {solar && <IconSun size={14} color="var(--mantine-color-yellow-filled)" />}
                    <Text size="xs" c="dimmed">
                      {rec.energyKwh != null ? `${formatNumber(rec.energyKwh)} kWh` : ''}
                      {solar
                        ? ' · solar: no energy bill'
                        : rec.energyCost != null
                          ? ` · about ${formatMoney(rec.energyCost, rec.currency)}`
                          : ''}
                    </Text>
                  </Group>
                )}
              </>
            )}

            {next && (
              <Paper withBorder radius="sm" p="xs">
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Box miw={0}>
                    <Text size="sm" fw={600} c={next.overdue ? 'orange' : undefined}>
                      {next.overdue ? 'Not confirmed: ' : 'Planned: '}
                      {formatWhen(next.startedAt)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatVolume(next.volumeM3)} · {formatDuration(next.durationMinutes)}
                    </Text>
                  </Box>
                  <Group gap={6} wrap="nowrap">
                    <Button
                      size="compact-sm"
                      leftSection={<IconCheck size={14} />}
                      onClick={() => onConfirm(next)}
                    >
                      Done
                    </Button>
                    <Tooltip label="Skip this run">
                      <ActionIcon
                        variant="default"
                        aria-label="Skip this run"
                        onClick={() => onSkip(next)}
                      >
                        <IconHandStop size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            )}
          </Stack>
        </Paper>

        {planted && rec.reasons.length > 0 && (
          <Box>
            <Group justify="space-between" wrap="nowrap">
              <UnstyledButton onClick={reasons.toggle} aria-expanded={reasonsOpened}>
                <Group gap={4}>
                  <Text size="sm" fw={500} c="dimmed">
                    Why this recommendation
                  </Text>
                  <IconChevronDown
                    size={14}
                    style={{
                      transform: reasonsOpened ? 'rotate(180deg)' : undefined,
                      transition: 'transform 150ms',
                    }}
                  />
                </Group>
              </UnstyledButton>
              <Tooltip label={rec.confidenceNote} multiline w={280} withArrow>
                <Badge variant="dot" color={CONFIDENCE[rec.confidence].color} size="sm">
                  {CONFIDENCE[rec.confidence].label}
                </Badge>
              </Tooltip>
            </Group>
            <Collapse expanded={reasonsOpened}>
              <List size="sm" spacing={4} mt="xs" c="dimmed">
                {rec.reasons.map((reason) => (
                  <List.Item key={reason}>{reason}</List.Item>
                ))}
              </List>
              <Text size="xs" c="dimmed" mt="xs">
                Method: FAO-56 soil water balance. {rec.confidenceNote}
              </Text>
            </Collapse>
          </Box>
        )}

        {planted && model && (
          <ModelOpinion assessment={model.assessment} available={model.available} />
        )}

        <Group justify="space-between" gap="xs">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              {field.lastIrrigation
                ? `Last irrigated ${formatRelative(field.lastIrrigation.startedAt)} · ${formatVolume(
                    field.lastIrrigation.volumeM3,
                  )}`
                : planted
                  ? 'No irrigation recorded yet'
                  : ''}
            </Text>
            {field.yieldAtRiskPct != null && field.yieldAtRiskPct >= 1 && (
              <Text size="xs" c="orange">
                Yield lost to water stress so far: {formatPercent(field.yieldAtRiskPct)}
              </Text>
            )}
          </Stack>
          <Group gap="xs">
            {planted && (
              <Button
                variant="default"
                size="xs"
                leftSection={<IconShovel size={14} />}
                onClick={() => onSoilCheck(field)}
              >
                Soil check
              </Button>
            )}
            {wantsWater(rec.decision) && !next && (
              <Button
                size="xs"
                leftSection={<IconCalendarPlus size={14} />}
                loading={planning}
                onClick={() => onPlan(field)}
              >
                Plan this irrigation
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600} fz="md" lh={1.2} className="app-num">
        {value}
      </Text>
    </Stack>
  );
}
