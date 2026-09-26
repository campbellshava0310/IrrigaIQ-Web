import {
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { IconDeviceDesktop, IconDeviceMobile } from '@tabler/icons-react';
import { z } from 'zod';

import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryStates';
import { PASSWORD_HINT, passwordSchema } from '@/features/auth/passwordPolicy';
import { useAuth } from '@/features/auth/useAuth';
import { toApiError } from '@/lib/api/errors';
import { confirmDestructive } from '@/lib/confirm';
import { formatRelative, humanize } from '@/lib/format';
import { applyServerErrors } from '@/lib/forms';
import { notifyError, notifySuccess } from '@/lib/notify';
import { describeUserAgent } from '@/lib/userAgent';

import {
  useChangePassword,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  useUpdateProfile,
  type Session,
} from '../api';

export function AccountPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Account" description="Your profile, password and signed-in devices." />
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Card withBorder>
            <Title order={3} fz="lg" mb="md">
              Profile
            </Title>
            {user && (
              <ProfileForm
                key={user.id}
                fullName={user.fullName}
                email={user.email}
                roles={user.roles}
              />
            )}
          </Card>
          <Card withBorder>
            <Title order={3} fz="lg" mb={4}>
              Password
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Changing your password signs you out on every other device.
            </Text>
            <PasswordForm />
          </Card>
        </SimpleGrid>
        <SessionsCard />
      </Stack>
    </>
  );
}

const profileSchema = z.object({ fullName: z.string().trim().min(1, 'Enter your name').max(200) });

function ProfileForm({
  fullName,
  email,
  roles,
}: {
  fullName: string;
  email: string;
  roles: string[];
}) {
  const update = useUpdateProfile();
  const form = useForm({
    initialValues: { fullName },
    validate: schemaResolver(profileSchema, { sync: true }),
  });
  const handleSubmit = form.onSubmit((values) =>
    update.mutate(
      { fullName: values.fullName.trim() },
      {
        onSuccess: (saved) => {
          form.resetDirty({ fullName: saved.fullName });
          notifySuccess('Profile updated');
        },
        onError: (error) => applyServerErrors(form, error, "Couldn't update your profile"),
      },
    ),
  );
  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <TextInput label="Full name" {...form.getInputProps('fullName')} />
        <TextInput
          label="Email"
          value={email}
          disabled
          description="Contact an administrator to change your email"
        />
        <Group gap="xs">
          {roles.map((role) => (
            <Badge key={role} variant="light">
              {humanize(role)}
            </Badge>
          ))}
        </Group>
        <Group justify="flex-end">
          <Button type="submit" loading={update.isPending} disabled={!form.isDirty()}>
            Save profile
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

function PasswordForm() {
  const change = useChangePassword();
  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirm: '' },
    validate: schemaResolver(passwordFormSchema, { sync: true }),
  });
  const handleSubmit = form.onSubmit(({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset();
          notifySuccess('Password changed. Other devices have been signed out.');
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.code === 'CURRENT_PASSWORD_INCORRECT') {
            form.setFieldError('currentPassword', apiError.message);
          } else if (apiError.code === 'PASSWORD_REUSE') {
            form.setFieldError('newPassword', apiError.message);
          } else {
            applyServerErrors(form, apiError, "Couldn't change your password");
          }
        },
      },
    ),
  );
  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack>
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          {...form.getInputProps('currentPassword')}
        />
        <PasswordInput
          label="New password"
          description={PASSWORD_HINT}
          autoComplete="new-password"
          {...form.getInputProps('newPassword')}
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          {...form.getInputProps('confirm')}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={change.isPending}>
            Change password
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function SessionsCard() {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const others = sessions.data?.filter((item) => !item.current).length ?? 0;

  const signOut = (item: Session) =>
    confirmDestructive({
      title: 'Sign out this device?',
      message: `${describeUserAgent(item.userAgent)} will need to sign in again.`,
      confirmLabel: 'Sign out',
      onConfirm: () =>
        revoke.mutate(item.id, {
          onSuccess: () => notifySuccess('Device signed out'),
          onError: (error) => notifyError(error),
        }),
    });
  const signOutOthers = () =>
    confirmDestructive({
      title: 'Sign out all other devices?',
      message: 'Every device except this one will need to sign in again.',
      confirmLabel: 'Sign out others',
      onConfirm: () =>
        revokeOthers.mutate(undefined, {
          onSuccess: () => notifySuccess('Other devices signed out'),
          onError: (error) => notifyError(error),
        }),
    });

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3} fz="lg">
            Signed-in devices
          </Title>
          <Text size="sm" c="dimmed">
            Sessions stay signed in for 30 days of inactivity at most.
          </Text>
        </div>
        <Button
          variant="light"
          color="red"
          size="sm"
          disabled={others === 0}
          onClick={signOutOthers}
        >
          Sign out other devices
        </Button>
      </Group>
      {sessions.isPending && <LoadingState />}
      {sessions.isError && <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />}
      {sessions.data && (
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Device</Table.Th>
                <Table.Th>IP address</Table.Th>
                <Table.Th>Last active</Table.Th>
                <Table.Th>Signed in</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.data.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {item.clientType === 'MOBILE' ? (
                        <IconDeviceMobile size={18} />
                      ) : (
                        <IconDeviceDesktop size={18} />
                      )}
                      <Text size="sm">{describeUserAgent(item.userAgent)}</Text>
                      {item.current && (
                        <Badge size="sm" variant="dot" color="teal">
                          This device
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" c="dimmed">
                      {item.ipAddress ?? '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>{formatRelative(item.lastUsedAt)}</Table.Td>
                  <Table.Td>{formatRelative(item.startedAt)}</Table.Td>
                  <Table.Td ta="right">
                    {!item.current && (
                      <Button variant="subtle" color="red" size="xs" onClick={() => signOut(item)}>
                        Sign out
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}
