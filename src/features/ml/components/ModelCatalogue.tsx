import {
  Card,
  Collapse,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';

import { formatPercent } from '@/lib/format';

import { useModelCatalogue } from '../api';
import type { ModelCard } from '../types';

/** The headline result each model was judged on, in words a farm manager can weigh. */
function headline(card: ModelCard): string | null {
  const test = card.heldOutTest;
  if (test?.balanced_accuracy != null) {
    return `${formatPercent(test.balanced_accuracy * 100)} balanced accuracy on held-out data`;
  }
  const evaluation = card.evaluation as
    | {
        detectionRate?: Record<string, number>;
        falseAlarmRate?: number;
        rocAuc?: number;
        ceiling?: { rocAuc?: number };
      }
    | undefined;
  if (evaluation?.detectionRate) {
    const rates = Object.values(evaluation.detectionRate);
    const lowest = Math.min(...rates);
    return `Caught ${formatPercent(lowest * 100)}–100% of simulated faults, ${formatPercent(
      (evaluation.falseAlarmRate ?? 0) * 100,
    )} false alarms`;
  }
  if (evaluation?.rocAuc != null && evaluation.ceiling?.rocAuc) {
    return `${formatPercent((100 * evaluation.rocAuc) / evaluation.ceiling.rocAuc)} of the best achievable ranking accuracy`;
  }
  return null;
}

/**
 * Published model cards from the ML service: what each model does, how it was tested, its limits.
 * Only the evaluated decision models are shown (not supporting components such as the text
 * embedder), and never version tags: the product describes what a model does, not which one runs.
 */
export function ModelCatalogue() {
  const catalogue = useModelCatalogue();
  if (catalogue.isPending) {
    return null;
  }
  if (!catalogue.data?.available) {
    return (
      <Text size="sm" c="dimmed">
        The ML service is offline, so its model cards are not available. Recommendations fall back
        to the water balance and maintenance rules.
      </Text>
    );
  }
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {catalogue.data.models.filter(evaluated).map((card) => (
        <ModelCardView key={card.name} card={card} />
      ))}
    </SimpleGrid>
  );
}

function evaluated(card: ModelCard): boolean {
  return card.evaluation != null || card.heldOutTest != null;
}

function ModelCardView({ card }: { card: ModelCard }) {
  const [opened, limits] = useDisclosure(false);
  const result = headline(card);
  return (
    <Card withBorder h="100%">
      <Title order={2} mb={6}>
        {card.name}
      </Title>
      <Stack gap={6}>
        <Text size="sm">{card.task}</Text>
        <Text size="xs" c="dimmed">
          {card.algorithm}
        </Text>
        {result && (
          <Text size="sm" fw={600}>
            {result}
          </Text>
        )}
        {card.limitations && card.limitations.length > 0 && (
          <>
            <UnstyledButton onClick={limits.toggle} aria-expanded={opened}>
              <Group gap={4}>
                <Text size="xs" fw={500} c="dimmed">
                  Limitations
                </Text>
                <IconChevronDown
                  size={12}
                  style={{
                    transform: opened ? 'rotate(180deg)' : undefined,
                    transition: 'transform 150ms',
                  }}
                />
              </Group>
            </UnstyledButton>
            <Collapse expanded={opened}>
              <List size="xs" spacing={4} c="dimmed">
                {card.limitations.map((limitation) => (
                  <List.Item key={limitation}>{limitation}</List.Item>
                ))}
              </List>
            </Collapse>
          </>
        )}
      </Stack>
    </Card>
  );
}
