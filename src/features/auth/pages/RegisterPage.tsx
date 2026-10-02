import { Anchor, Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import { applyServerErrors } from '@/lib/forms';

import { PASSWORD_HINT, passwordSchema } from '../passwordPolicy';
import { useAuth } from '../useAuth';

const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name').max(200),
    email: z.email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    initialValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    validate: schemaResolver(schema, { sync: true }),
  });

  const handleSubmit = form.onSubmit(async ({ fullName, email, password }) => {
    setSubmitting(true);
    try {
      await register({ fullName: fullName.trim(), email, password });
      navigate('/farms', { replace: true });
    } catch (error) {
      applyServerErrors(form, error, "Couldn't create your account");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <div>
          <Title order={1} fz={26} lts={-0.6}>
            Create your account
          </Title>
          <Text c="dimmed" mt={6}>
            Set up your farm in a few minutes. No sensors needed to start.
          </Text>
        </div>
        <TextInput
          label="Full name"
          autoComplete="name"
          required
          {...form.getInputProps('fullName')}
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Password"
          description={PASSWORD_HINT}
          autoComplete="new-password"
          required
          {...form.getInputProps('password')}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          required
          {...form.getInputProps('confirmPassword')}
        />
        <Button type="submit" loading={submitting} fullWidth size="md" mt={4}>
          Create account
        </Button>
        <Text size="sm" ta="center" c="dimmed">
          Already have an account?{' '}
          <Anchor component={Link} to="/login">
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
