import { Box, Group, Text } from '@mantine/core';

/**
 * The IrrigaIQ mark: a water droplet with a leaf cut into it, flat on a forest square. The leaf
 * takes the square's colour through --mark-bg, so the mark works on any surface.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Box
      className="app-brand-mark"
      w={size}
      h={size}
      style={{ borderRadius: Math.round(size * 0.28) }}
      aria-hidden
    >
      <svg width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} viewBox="0 0 24 24">
        <path
          d="M12 2.75c-.35 0-6.75 7.05-6.75 11.9a6.75 6.75 0 0 0 13.5 0C18.75 9.8 12.35 2.75 12 2.75Z"
          fill="currentColor"
        />
        <path d="M8.9 18.1c-.2-3.6 2-6.2 6.1-6.7.2 3.7-2.1 6.2-6.1 6.7Z" fill="var(--mark-bg)" />
        <path
          d="M10.1 16.8 13.5 13.1"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}

export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const large = size === 'lg';
  return (
    <Group gap={large ? 10 : 9} wrap="nowrap">
      <BrandMark size={large ? 34 : 28} />
      <Text className="app-wordmark" fw={700} fz={large ? 18 : 15} lh={1}>
        Irriga
        <Text span inherit className="app-wordmark-accent">
          IQ
        </Text>
      </Text>
    </Group>
  );
}
