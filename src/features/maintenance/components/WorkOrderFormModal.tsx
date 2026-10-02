import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';
import { z } from 'zod';

import { useAssets } from '@/features/infrastructure/api';
import { ASSET_TYPE } from '@/features/infrastructure/presentation';
import { applyServerErrors, optionalText } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useSaveWorkOrder } from '../api';
import { KIND, PRIORITY } from '../presentation';
import {
  WORK_ORDER_KINDS,
  WORK_ORDER_PRIORITIES,
  type WorkOrder,
  type WorkOrderKind,
  type WorkOrderPriority,
} from '../types';

const schema = z.object({
  title: z.string().trim().min(1, 'Describe the job').max(200),
  kind: z.enum(WORK_ORDER_KINDS, 'Select the kind of work'),
  description: z.string().max(2000),
  assignee: z.string().max(160),
});

export interface WorkOrderDraft {
  assetId?: string | null;
  kind?: WorkOrderKind;
  priority?: WorkOrderPriority;
  title?: string;
  description?: string;
  dueOn?: string | null;
}

interface WorkOrderFormModalProps {
  opened: boolean;
  onClose: () => void;
  farmId: string;
  workOrder?: WorkOrder;
  draft?: WorkOrderDraft;
  onSaved?: (workOrder: WorkOrder) => void;
}

export function WorkOrderFormModal({
  opened,
  onClose,
  workOrder,
  draft,
  ...props
}: WorkOrderFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={workOrder ? `Edit ${workOrder.reference}` : 'New work order'}
      size="lg"
      centered
    >
      <WorkOrderForm
        key={workOrder?.id ?? `${draft?.assetId ?? 'new'}-${draft?.title ?? ''}`}
        workOrder={workOrder}
        draft={draft}
        onClose={onClose}
        {...props}
      />
    </Modal>
  );
}

function WorkOrderForm({
  farmId,
  workOrder,
  draft,
  onClose,
  onSaved,
}: Omit<WorkOrderFormModalProps, 'opened'>) {
  const save = useSaveWorkOrder(farmId, workOrder?.id);
  const assets = useAssets(farmId);
  const form = useForm({
    initialValues: {
      assetId: workOrder?.asset?.id ?? draft?.assetId ?? null,
      kind: (workOrder?.kind ?? draft?.kind ?? 'PREVENTIVE') as WorkOrderKind | null,
      priority: (workOrder?.priority ?? draft?.priority ?? 'MEDIUM') as WorkOrderPriority | null,
      title: workOrder?.title ?? draft?.title ?? '',
      description: workOrder?.description ?? draft?.description ?? '',
      dueOn: workOrder?.dueOn ?? draft?.dueOn ?? null,
      assignee: workOrder?.assignee ?? '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  const handleSubmit = form.onSubmit((values) => {
    if (!values.kind) {
      return;
    }
    save.mutate(
      {
        assetId: values.assetId,
        kind: values.kind,
        priority: values.priority,
        title: values.title.trim(),
        description: optionalText(values.description),
        dueOn: values.dueOn,
        assignee: optionalText(values.assignee),
      },
      {
        onSuccess: (saved) => {
          notifySuccess(workOrder ? `${saved.reference} updated` : `${saved.reference} created`);
          onSaved?.(saved);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't save the work order"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <TextInput
          label="Job"
          placeholder="e.g. Replace mechanical seal on P-2"
          required
          data-autofocus
          {...form.getInputProps('title')}
        />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Select
            label="Kind"
            description={form.values.kind ? KIND[form.values.kind].description : undefined}
            data={WORK_ORDER_KINDS.map((value) => ({ value, label: KIND[value].label }))}
            allowDeselect={false}
            required
            {...form.getInputProps('kind')}
          />
          <Select
            label="Priority"
            data={WORK_ORDER_PRIORITIES.map((value) => ({ value, label: PRIORITY[value].label }))}
            allowDeselect={false}
            {...form.getInputProps('priority')}
          />
          <DateInput
            label="Due"
            valueFormat="DD MMM YYYY"
            clearable
            {...form.getInputProps('dueOn')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Asset"
            placeholder="General farm job"
            data={(assets.data ?? []).map((asset) => ({
              value: asset.id,
              label: `${asset.name} · ${ASSET_TYPE[asset.type].label}`,
            }))}
            searchable
            clearable
            {...form.getInputProps('assetId')}
          />
          <TextInput
            label="Assigned to"
            placeholder="Person or contractor"
            {...form.getInputProps('assignee')}
          />
        </SimpleGrid>
        <Textarea
          label="Details"
          autosize
          minRows={3}
          maxLength={2000}
          placeholder="Symptoms, parts needed, safety notes"
          {...form.getInputProps('description')}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {workOrder ? 'Save changes' : 'Create work order'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
