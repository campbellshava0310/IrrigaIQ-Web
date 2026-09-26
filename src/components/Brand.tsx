import { Box, Group, Text } from '@mantine/core';
import { IconDropletFilled } from '@tabler/icons-react';

/** The droplet app mark: the same teal gradient as the mobile app icon. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Box
      className="app-brand-mark"
      w={size}
      h={size}
      style={{ borderRadius: Math.round(size * 0.3) }}
      aria-hidden
    >
      <IconDropletFilled size={Math.round(size * 0.56)} />
    </Box>
  );
}

export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const large = size === 'lg';
  return (
    <Group gap={large ? 10 : 8} wrap="nowrap">
      <BrandMark size={large ? 36 : 28} />
      <Text fw={700} fz={large ? 22 : 17} lts={-0.4} lh={1}>
        Irriga
        <Text span inherit c="brand">
          IQ
        </Text>
      </Text>
    </Group>
  );
}
