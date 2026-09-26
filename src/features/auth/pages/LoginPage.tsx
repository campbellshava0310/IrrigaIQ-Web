import { Alert, Anchor, Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, type Location } from 'react-router';
import { z } from 'zod';

import { toApiError } from '@/lib/api/errors';

import { useAuth } from '../useAuth';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: schemaResolver(schema, { sync: true }),
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values);
      const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (caught) {
      setError(toApiError(caught).message);
      form.setFieldValue('password', '');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="lg">
        <div>
          <Title order={1} fz={26} lts={-0.6}>
            Welcome back
          </Title>
          <Text c="dimmed" mt={6}>
            Sign in to see today's irrigation plan and equipment health.
          </Text>
        </div>
        {error && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            {error}
          </Alert>
        )}
        <TextInput
          label="Email"
          type="email"
          autoComplete="username"
          required
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          required
          {...form.getInputProps('password')}
        />
        <Button type="submit" loading={submitting} fullWidth size="md" mt={4}>
          Sign in
        </Button>
        <Text size="sm" ta="center" c="dimmed">
          New to IrrigaIQ?{' '}
          <Anchor component={Link} to="/register">
            Create an account
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
