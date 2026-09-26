import { Center, Loader, Stack, Text } from '@mantine/core';

import { BrandMark } from './Brand';

export function FullPageLoader({ label = 'Loading IrrigaIQ…' }: { label?: string }) {
  return (
    <Center h="100vh" role="status" aria-live="polite">
      <Stack align="center" gap="md">
        <BrandMark size={44} />
        <Loader size="sm" type="dots" />
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}
