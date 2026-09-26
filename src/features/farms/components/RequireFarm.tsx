import { Button, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlant2, IconPlus, IconSparkles } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates';
import { useCreateDemoFarm } from '@/features/admin/api';
import { useAuth } from '@/features/auth/useAuth';
import { notifyError, notifySuccess } from '@/lib/notify';

import { useCurrentFarm } from '../currentFarm';
import type { Farm } from '../types';

import { FarmFormModal } from './FarmFormModal';

/**
 * Gate for farm-scoped screens: resolves the current farm, or guides a new user to create one
 * (admins can also load the demo farm to explore every feature with realistic data).
 */
export function RequireFarm({ children }: { children: (farm: Farm) => ReactNode }) {
  const { farm, isPending, error, refetch, select } = useCurrentFarm();
  const { isAdmin } = useAuth();
  const [createOpened, create] = useDisclosure(false);
  const demo = useCreateDemoFarm();

  if (isPending) {
    return <LoadingState layout="page" label="Loading your farms…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  if (farm) {
    return <>{children(farm)}</>;
  }

  return (
    <>
      <EmptyState
        icon={<IconPlant2 size={24} />}
        title="Set up your first farm"
        description="Add your farm, its fields and crops, and the pumps and water sources that serve them. IrrigaIQ then plans irrigation from the weather and watches your infrastructure for early signs of failure."
        action={
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={create.open}>
              Create a farm
            </Button>
            {isAdmin && (
              <Button
                variant="light"
                leftSection={<IconSparkles size={16} />}
                loading={demo.isPending}
                onClick={() =>
                  demo.mutate(null, {
                    onSuccess: (result) => {
                      select(result.farmId);
                      notifySuccess(`${result.farmName} is ready to explore`, 'Demo farm created');
                    },
                    onError: (cause) => notifyError(cause, "Couldn't create the demo farm"),
                  })
                }
              >
                Load the demo farm
              </Button>
            )}
          </Group>
        }
      />
      <FarmFormModal
        opened={createOpened}
        onClose={create.close}
        onSaved={(saved) => select(saved.id)}
      />
    </>
  );
}
