import {
  Button,
  Checkbox,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
  type CheckboxGroupProps,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { z } from 'zod';

import { PASSWORD_HINT, passwordSchema } from '@/features/auth/passwordPolicy';
import type { Role } from '@/lib/auth/types';
import { applyServerErrors } from '@/lib/forms';
import { notifySuccess } from '@/lib/notify';

import { useCreateUser, useUpdateUser } from '../api';
import { ROLES, type AdminUser, type UpdateUserInput } from '../types';

const roleSchema = z.array(z.enum(['ADMIN', 'FARM_MANAGER'])).min(1, 'Assign at least one role');

function RoleCheckboxes({
  disabledRoles = [],
  ...props
}: Omit<CheckboxGroupProps, 'children'> & { disabledRoles?: Role[] }) {
  return (
    <Checkbox.Group label="Roles" {...props}>
      <Stack gap="xs" mt="xs">
        {ROLES.map((role) => (
          <Checkbox
            key={role.value}
            value={role.value}
            label={role.label}
            description={role.description}
            disabled={disabledRoles.includes(role.value)}
          />
        ))}
      </Stack>
    </Checkbox.Group>
  );
}

// ---- Create ----

const createSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter a name').max(200),
  email: z.email('Enter a valid email address'),
  temporaryPassword: passwordSchema,
  roles: roleSchema,
});

export function CreateUserModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Create user" centered>
      <CreateUserForm onClose={onClose} />
    </Modal>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const form = useForm({
    initialValues: {
      fullName: '',
      email: '',
      temporaryPassword: '',
      roles: ['FARM_MANAGER'] as Role[],
    },
    validate: schemaResolver(createSchema, { sync: true }),
  });
  const handleSubmit = form.onSubmit((values) =>
    create.mutate(
      { ...values, fullName: values.fullName.trim() },
      {
        onSuccess: () => {
          notifySuccess(
            `${values.email} can now sign in with the temporary password`,
            'User created',
          );
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't create the user"),
      },
    ),
  );
  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <TextInput label="Full name" required data-autofocus {...form.getInputProps('fullName')} />
        <TextInput label="Email" type="email" required {...form.getInputProps('email')} />
        <PasswordInput
          label="Temporary password"
          description={`${PASSWORD_HINT} Share it securely; the user should change it after signing in.`}
          required
          autoComplete="new-password"
          {...form.getInputProps('temporaryPassword')}
        />
        <RoleCheckboxes {...form.getInputProps('roles')} />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create user
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ---- Edit ----

const editSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter a name').max(200),
  roles: roleSchema,
  enabled: z.boolean(),
});

interface EditUserModalProps {
  opened: boolean;
  /** Kept after closing so the content stays rendered during the exit transition. */
  user: AdminUser | null;
  isSelf: boolean;
  onClose: () => void;
}

export function EditUserModal({ opened, user, isSelf, onClose }: EditUserModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Edit user" centered>
      {user && <EditUserForm key={user.id} user={user} isSelf={isSelf} onClose={onClose} />}
    </Modal>
  );
}

function EditUserForm({
  user,
  isSelf,
  onClose,
}: {
  user: AdminUser;
  isSelf: boolean;
  onClose: () => void;
}) {
  const update = useUpdateUser();
  const form = useForm({
    initialValues: { fullName: user.fullName, roles: user.roles, enabled: user.enabled },
    validate: schemaResolver(editSchema, { sync: true }),
  });

  const handleSubmit = form.onSubmit((values) => {
    // Send only what changed so the audit log records exactly what the admin did.
    const input: UpdateUserInput = {};
    if (values.fullName.trim() !== user.fullName) input.fullName = values.fullName.trim();
    if ([...values.roles].sort().join() !== [...user.roles].sort().join())
      input.roles = values.roles;
    if (values.enabled !== user.enabled) input.enabled = values.enabled;
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { id: user.id, input },
      {
        onSuccess: () => {
          notifySuccess(`${user.email} updated`);
          onClose();
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't update the user"),
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <Text size="sm" c="dimmed">
          {user.email}
        </Text>
        <TextInput label="Full name" {...form.getInputProps('fullName')} />
        <RoleCheckboxes {...form.getInputProps('roles')} disabledRoles={isSelf ? ['ADMIN'] : []} />
        <Switch
          label="Account enabled"
          description="Disabling signs the user out of every device immediately."
          disabled={isSelf}
          {...form.getInputProps('enabled', { type: 'checkbox' })}
        />
        {isSelf && (
          <Text size="xs" c="dimmed">
            You can't remove your own administrator access or disable your own account.
          </Text>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
