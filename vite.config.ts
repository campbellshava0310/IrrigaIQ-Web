import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The dev server proxies the API to the backend so the browser sees a single origin. That keeps the
// SameSite=Strict refresh cookie working and mirrors production, where nginx does the same.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';
  const proxy = {
    '/api': { target: apiTarget, changeOrigin: false },
    '/actuator/health': { target: apiTarget, changeOrigin: false },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: {
      sourcemap: true,
      rolldownOptions: {
        output: {
          // Vendor code changes far less often than app code; separate chunks stay cached across deploys.
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              },
              {
                name: 'vendor-mantine',
                test: /node_modules[\\/](@mantine[\\/](?!charts[\\/]|dates[\\/])|@floating-ui[\\/])/,
              },
              // Date pickers only appear in forms; after vendor-mantine so they do not pull core with them.
              {
                name: 'vendor-mantine-dates',
                test: /node_modules[\\/](@mantine[\\/]dates|dayjs)[\\/]/,
              },
              // Charts (Recharts + d3) are only needed by the lazily loaded chart pages. Groups claim
              // modules and their dependencies in order, so this comes after vendor-mantine: otherwise
              // it would pull Mantine core in with @mantine/charts and back onto the first load.
              {
                name: 'vendor-charts',
                test: /node_modules[\\/](@mantine[\\/]charts|recharts|d3-[^\\/]+|victory-vendor|@reduxjs|redux|react-redux|reselect|immer|decimal\.js-light|es-toolkit|eventemitter3|internmap)[\\/]/,
              },
              { name: 'vendor-data', test: /node_modules[\\/](@tanstack|axios|zod)[\\/]/ },
              { name: 'vendor-icons', test: /node_modules[\\/]@tabler[\\/]/ },
            ],
          },
        },
      },
    },
  };
});
