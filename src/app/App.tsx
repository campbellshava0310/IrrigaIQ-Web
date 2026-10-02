import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router/dom';

import { session } from '@/lib/auth/session';

import { queryClient } from './queryClient';
import { router } from './router';
import { cssVariablesResolver, theme } from './theme';

/** Restores the session on load and drops all cached server data when it ends. */
function useSessionLifecycle() {
  useEffect(() => {
    void session.bootstrap();
    let previous = session.getState().status;
    return session.subscribe(() => {
      const status = session.getState().status;
      if (previous === 'authenticated' && status === 'anonymous') {
        queryClient.clear();
      }
      previous = status;
    });
  }, []);
}

export function App() {
  useSessionLifecycle();
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <QueryClientProvider client={queryClient}>
        <ModalsProvider>
          <Notifications position="top-right" />
          <RouterProvider router={router} />
        </ModalsProvider>
        {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-right" />}
      </QueryClientProvider>
    </MantineProvider>
  );
}
