import axios from 'axios';

import { env } from '@/config/env';

import type { AuthResponse, LoginCredentials, Registration } from './types';

/**
 * Raw auth endpoints on a dedicated client with no auth interceptors, so a failing refresh can
 * never recurse into another refresh. The refresh token travels only as an HttpOnly cookie.
 */
const http = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'X-Client-Type': env.clientType },
});

export const authApi = {
  login: (credentials: LoginCredentials) =>
    http.post<AuthResponse>('/auth/login', credentials).then((response) => response.data),
  register: (registration: Registration) =>
    http.post<AuthResponse>('/auth/register', registration).then((response) => response.data),
  refresh: () => http.post<AuthResponse>('/auth/refresh').then((response) => response.data),
  logout: () => http.post('/auth/logout').then(() => undefined),
};

export type AuthApi = typeof authApi;
