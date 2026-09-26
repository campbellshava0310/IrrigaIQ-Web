import { RingProgress, Stack, Text } from '@mantine/core';

import { scoreColor } from '../presentation';

interface HealthRingProps {
  score: number;
  size?: number;
  label?: string;
}

/** 0-100 asset health score; colour bands match the risk levels. */
export function HealthRing({ score, size = 96, label }: HealthRingProps) {
  const thickness = Math.max(6, Math.round(size / 11));
  return (
    <RingProgress
      size={size}
      thickness={thickness}
      roundCaps
      aria-label={`Health score ${score} out of 100`}
      sections={[{ value: score, color: scoreColor(score) }]}
      label={
        <Stack gap={0} align="center">
          <Text fw={650} className="app-num" fz={size >= 90 ? 24 : size >= 60 ? 16 : 12} lh={1}>
            {score}
          </Text>
          {label && size >= 90 && (
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          )}
        </Stack>
      }
    />
  );
}
