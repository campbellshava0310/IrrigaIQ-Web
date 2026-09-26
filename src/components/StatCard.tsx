import { Card, Group, Skeleton, Text, ThemeIcon } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  /** Unit or qualifier set smaller after the value ("mm", "of 12"). */
  unit?: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  /** Mantine colour for the icon badge; status colours pair with a hint that says why. */
  color?: string;
  /** Makes the whole card a link to the screen that explains the number. */
  to?: string;
}

/** The one metric tile used across the app: icon and label, a big number, a quiet hint. */
export function StatCard({
  label,
  value,
  icon,
  unit,
  hint,
  loading,
  color = 'brand',
  to,
}: StatCardProps) {
  const body = (
    <>
      <Group gap={10} wrap="nowrap">
        <ThemeIcon size={28} radius="sm" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <Text size="sm" fw={500} c="dimmed" lh={1.3} lineClamp={2} title={label}>
          {label}
        </Text>
      </Group>
      {loading ? (
        <Skeleton h={30} w={72} mt={14} radius="sm" />
      ) : (
        <Text component="div" mt={12} fz={28} fw={650} lh={1.1} lts={-0.6} className="app-num">
          {value}
          {unit && (
            <Text span fz="md" fw={500} c="dimmed" lts={0} ml={4}>
              {unit}
            </Text>
          )}
        </Text>
      )}
      {hint && (
        <Text component="div" size="xs" c="dimmed" mt={6} lineClamp={2}>
          {hint}
        </Text>
      )}
    </>
  );

  if (to) {
    return (
      <Card component={Link} to={to} withBorder padding="md" aria-label={label}>
        {body}
      </Card>
    );
  }
  return (
    <Card withBorder padding="md">
      {body}
    </Card>
  );
}
