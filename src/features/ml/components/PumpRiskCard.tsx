import { Badge, Button, Card, Grid, Group, Stack, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconSparkles } from '@tabler/icons-react';

import { assistant } from '@/features/assistant/store';

import { useEquipmentRisk } from '../api';
import { RISK_LEVEL, RISK_SOURCE, formatProbability } from '../presentation';

/**
 * The failure-risk model's view of one pump: the chance it fails in the next 14 days, the readings
 * behind it, and what it could not see. Shown beside (not instead of) the rule-based health score.
 */
export function PumpRiskCard({ farmId, assetId }: { farmId: string; assetId: string }) {
  const risk = useEquipmentRisk(farmId);
  const pump = risk.data?.pumps.find((candidate) => candidate.assetId === assetId);
  if (!pump) {
    return null;
  }
  if (!risk.data?.available || !pump.risk) {
    return (
      <Card withBorder mb="lg">
        <Text size="sm" c="dimmed">
          The failure-risk model is offline; the health score above is from the maintenance rules.
        </Text>
      </Card>
    );
  }
  const model = pump.risk;
  const level = RISK_LEVEL[model.riskLevel];

  return (
    <Card withBorder mb="lg" className="app-ai" style={{ boxShadow: 'none' }}>
      <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
        <Group gap={6} className="app-ai-label">
          <IconSparkles size={13} />
          Failure risk · next {model.horizonDays} days
        </Group>
        <Badge variant="dot" color={level.color}>
          {level.label}
        </Badge>
      </Group>
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Text fz={32} fw={600} lh={1.1} className="app-num">
            {formatProbability(model.failureProbability)}
          </Text>
          <Text size="sm" c="dimmed">
            chance of failure within {model.horizonDays} days
          </Text>
          <Text size="sm" fw={600} mt="sm">
            {model.recommendation}
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <Text size="sm" fw={600} mb={6}>
            Readings raising the risk
          </Text>
          {model.indicators.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nothing stands out: readings are close to a healthy pump&apos;s.
            </Text>
          ) : (
            <Stack gap={6}>
              {model.indicators.map((indicator) => (
                <Group key={indicator.feature} gap={8} wrap="nowrap">
                  {indicator.trend === 'up' ? (
                    <IconArrowUpRight size={15} color="var(--mantine-color-orange-filled)" />
                  ) : (
                    <IconArrowDownRight size={15} color="var(--mantine-color-orange-filled)" />
                  )}
                  <Text size="sm" style={{ flex: 1 }}>
                    {indicator.label} <b className="app-num">{indicator.value}</b>{' '}
                    <Text span size="sm" c="dimmed">
                      (healthy {indicator.healthy})
                    </Text>
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
          <Text size="xs" c="dimmed" mt="sm">
            From {pump.sources.map((source) => RISK_SOURCE[source]).join(', ') || 'asset records'}.
            {model.missing.length > 0 &&
              ` Not measured: ${model.missing.join(', ').toLowerCase()}.`}
          </Text>
        </Grid.Col>
      </Grid>
      <Group justify="space-between" mt="md" gap="xs">
        <Text size="xs" c="dimmed" maw={560}>
          Gradient boosting trained on a simulated pump fleet, constrained so worse readings never
          lower the risk. It complements the rule-based score; retrain on real failures before
          relying on it alone.
        </Text>
        <Button
          size="compact-sm"
          variant="default"
          onClick={() =>
            assistant.open(
              `Why is ${pump.assetName} at ${level.label.toLowerCase()} risk, and what should I check?`,
            )
          }
        >
          Ask IrrigaIQ
        </Button>
      </Group>
    </Card>
  );
}
