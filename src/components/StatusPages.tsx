import { Button, Center, Code, Stack, Text, Title } from '@mantine/core';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

function StatusPage({ code, title, message }: { code: string; title: string; message: string }) {
  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs" maw={440}>
        <Text fz={64} fw={700} c="brand" lh={1} lts={-2} className="app-num">
          {code}
        </Text>
        <Title order={2} mt="sm">
          {title}
        </Title>
        <Text c="dimmed" ta="center">
          {message}
        </Text>
        <Button component={Link} to="/" variant="default" mt="md">
          Back to overview
        </Button>
      </Stack>
    </Center>
  );
}

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      message="The page you are looking for does not exist or was moved."
    />
  );
}

export function ForbiddenPage() {
  return (
    <StatusPage
      code="403"
      title="Not available for your account"
      message="This area requires additional permissions. Ask a platform administrator if you need access."
    />
  );
}

/** Route-level error boundary: a crash in one screen never blanks the whole app. */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }
  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs" maw={520}>
        <Title order={2}>Something went wrong</Title>
        <Text c="dimmed" ta="center">
          An unexpected error occurred while rendering this screen. Reloading usually helps.
        </Text>
        {import.meta.env.DEV && error instanceof Error && <Code block>{error.message}</Code>}
        <Button onClick={() => window.location.reload()} variant="default" mt="md">
          Reload
        </Button>
      </Stack>
    </Center>
  );
}
