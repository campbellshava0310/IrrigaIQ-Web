import { Button, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useCurrentFarm } from '@/features/farms/currentFarm';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useCreateDemoFarm } from '../api';

/**
 * Seeds a complete, realistic farm for demos and onboarding: four irrigated fields with a season
 * of history, a water network with a degrading pump and clogging filter, work orders and alerts.
 */
export function DemoFarmCard() {
  const create = useCreateDemoFarm();
  const { select } = useCurrentFarm();
  const navigate = useNavigate();
  const [ownerEmail, setOwnerEmail] = useState('');

  const submit = () =>
    create.mutate(ownerEmail.trim() || null, {
      onSuccess: (result) => {
        notifySuccess(
          `${result.fields} fields, ${result.assets} assets, ${result.irrigations} irrigations and ${result.openAlerts} open alerts for ${result.ownerEmail}.`,
          `${result.farmName} created`,
        );
        if (!ownerEmail.trim()) {
          select(result.farmId);
          navigate('/');
        }
      },
      onError: (error) => notifyError(error, "Couldn't create the demo farm"),
    });

  return (
    <Card withBorder>
      <Group gap="xs" mb="xs">
        <IconSparkles size={20} />
        <Text fw={600}>Demo farm</Text>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Creates a realistic Mazowe farm with a season of irrigation history, a water network with a
        degrading pump and a clogging filter, open work orders and live alerts. Good for demos,
        training and trying features safely.
      </Text>
      <Stack gap="sm">
        <TextInput
          label="Owner"
          description="Leave blank to own it yourself"
          placeholder="farmer@example.com"
          type="email"
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button
            leftSection={<IconSparkles size={16} />}
            loading={create.isPending}
            onClick={submit}
          >
            Create demo farm
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
