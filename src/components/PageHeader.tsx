import { ActionIcon, Anchor, Box, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  /** Small line above the title: the farm, a date, a status. */
  eyebrow?: ReactNode;
  /** How the page works, behind an info icon, so the description can stay one line. */
  help?: string;
}

export function PageHeader({ title, description, actions, back, eyebrow, help }: PageHeaderProps) {
  return (
    <Stack gap={10} mb={28}>
      {back && (
        <Anchor
          component={Link}
          to={back.to}
          size="sm"
          c="dimmed"
          underline="never"
          w="fit-content"
          ml={-4}
        >
          <Group gap={2} wrap="nowrap">
            <IconChevronLeft size={16} />
            {back.label}
          </Group>
        </Anchor>
      )}
      <Group justify="space-between" align="flex-end" gap="md">
        <Box miw={0} style={{ flex: '1 1 320px' }}>
          {eyebrow && (
            <Text size="sm" c="dimmed" fw={500} mb={4}>
              {eyebrow}
            </Text>
          )}
          <Group gap={8} wrap="nowrap" align="center">
            <Title order={1} fz={{ base: 24, sm: 28 }} lh={1.2}>
              {title}
            </Title>
            {help && (
              <Tooltip label={help} multiline w={320} position="bottom-start">
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label={help}>
                  <IconInfoCircle size={17} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          {description && (
            <Text c="dimmed" fz="md" maw={680} mt={6}>
              {description}
            </Text>
          )}
        </Box>
        {actions && (
          <Group gap="xs" wrap="wrap">
            {actions}
          </Group>
        )}
      </Group>
    </Stack>
  );
}
