import { Box, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconCalendarClock,
  IconDroplet,
  IconEngine,
  IconPlant2,
  IconShieldCheck,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router';

import { Brand } from '@/components/Brand';
import { RedirectIfAuthenticated } from '@/features/auth/guards';

const VALUE = [
  { icon: IconDroplet, text: 'Irrigation plans from soil water, crop stage and forecast rain' },
  { icon: IconEngine, text: 'Pump and borehole health, with service due before failure' },
  { icon: IconShieldCheck, text: 'Alerts for leaks, stress and abnormal consumption' },
];

/** An illustrative slice of the product (not live data): what a morning looks like in IrrigaIQ. */
function ProductGlimpse() {
  return (
    <Stack gap={12} aria-hidden>
      <Box className="app-glass" p="md">
        <Group justify="space-between" wrap="nowrap" mb={10}>
          <Group gap={8} wrap="nowrap">
            <IconCalendarClock size={16} />
            <Text size="xs" fw={600} opacity={0.85}>
              Next up · tomorrow 05:30
            </Text>
          </Group>
          <Text size="xs" fw={600} className="app-glass-pill">
            Saves 21% water
          </Text>
        </Group>
        <Text fw={650} fz="lg" lh={1.25}>
          Irrigate North Pivot for 3 h 10 min
        </Text>
        <Text size="sm" opacity={0.75} mt={2}>
          38 mm · soil at 41% of available water · no rain expected
        </Text>
        <Box mt={14} className="app-glass-bar">
          <Box className="app-glass-bar-fill" w="41%" />
        </Box>
      </Box>
      <SimpleGrid cols={2} spacing={12}>
        <Box className="app-glass" p="md">
          <Group gap={8} wrap="nowrap">
            <IconEngine size={16} />
            <Text size="xs" fw={600} opacity={0.85}>
              Borehole pump B2
            </Text>
          </Group>
          <Text fw={650} fz={22} mt={6} className="app-num">
            72
            <Text span size="sm" fw={500} opacity={0.7} ml={4}>
              health
            </Text>
          </Text>
          <Text size="xs" opacity={0.75}>
            Service due in 6 days
          </Text>
        </Box>
        <Box className="app-glass" p="md">
          <Group gap={8} wrap="nowrap">
            <IconPlant2 size={16} />
            <Text size="xs" fw={600} opacity={0.85}>
              This season
            </Text>
          </Group>
          <Text fw={650} fz={22} mt={6} className="app-num">
            1.8
            <Text span size="sm" fw={500} opacity={0.7} ml={4}>
              ML saved
            </Text>
          </Text>
          <Text size="xs" opacity={0.75}>
            Against a weekly schedule
          </Text>
        </Box>
      </SimpleGrid>
    </Stack>
  );
}

/** The split-screen frame for sign-in and sign-up: form on the left, product story on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <Box className="app-auth">
      <Stack className="app-auth-form" justify="space-between" p={{ base: 'lg', sm: 40 }}>
        <Link
          to="/login"
          style={{ textDecoration: 'none', color: 'inherit', width: 'fit-content' }}
        >
          <Brand />
        </Link>
        <Box w="100%" maw={380} mx="auto" py="xl">
          {children}
        </Box>
        <Text size="xs" c="dimmed">
          © {new Date().getFullYear()} IrrigaIQ · Water intelligence for farms
        </Text>
      </Stack>

      <Box className="app-auth-panel" visibleFrom="md">
        <Stack maw={500} mx="auto" h="100%" justify="center" gap={36} p={48}>
          <Stack gap={14}>
            <Text size="sm" fw={600} className="app-glass-pill" w="fit-content">
              Farm intelligence
            </Text>
            <Title order={2} fz={34} lh={1.15} lts={-1} c="white">
              Water every field at the right time. Fix pumps before they fail.
            </Title>
          </Stack>
          <ProductGlimpse />
          <Stack gap={12}>
            {VALUE.map(({ icon: Icon, text }) => (
              <Group key={text} gap={12} wrap="nowrap">
                <Icon size={18} style={{ flexShrink: 0, opacity: 0.85 }} />
                <Text size="sm" opacity={0.85}>
                  {text}
                </Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export function AuthLayout() {
  return (
    <RedirectIfAuthenticated>
      <AuthShell>
        <Outlet />
      </AuthShell>
    </RedirectIfAuthenticated>
  );
}
