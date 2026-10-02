import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { session } from '@/lib/auth/session';

import { toApiError } from './errors';

type RetryableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

/**
 * The one HTTP client for feature code. It attaches the access token, transparently refreshes
 * once on 401, and rejects with {@link ApiError} so callers never see raw axios errors.
 */
const client = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: { 'X-Client-Type': env.clientType },
});

client.interceptors.request.use((config) => {
  const token = session.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

client.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetryableConfig | undefined;
  if (error.response?.status === 401 && config && !config._authRetried) {
    config._authRetried = true;
    const outcome = await session.refresh();
    if (outcome === 'refreshed') {
      return client.request(config);
    }
    if (outcome === 'rejected') {
      session.expire();
    }
  }
  throw toApiError(error);
});

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    client.get<T>(url, config).then((response) => response.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.post<T>(url, body, config).then((response) => response.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.put<T>(url, body, config).then((response) => response.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.patch<T>(url, body, config).then((response) => response.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    client.delete<T>(url, config).then((response) => response.data),
};
