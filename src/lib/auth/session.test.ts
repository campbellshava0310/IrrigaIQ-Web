import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import type { AuthApi } from './authApi';
import { SessionStore } from './session';
import type { AuthResponse } from './types';

const auth = (token: string): AuthResponse => ({
  accessToken: token,
  tokenType: 'Bearer',
  expiresIn: 900,
  accessTokenExpiresAt: '2026-09-24T10:15:00Z',
  refreshTokenExpiresAt: '2026-10-24T10:00:00Z',
  user: {
    id: 'u1',
    email: 'farmer@example.com',
    fullName: 'Farmer One',
    roles: ['FARM_MANAGER'],
    enabled: true,
    lastLoginAt: null,
    createdAt: '2026-09-01T00:00:00Z',
  },
});

const httpError = (status: number) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { code: 'REFRESH_TOKEN_INVALID', detail: 'The session has expired' },
    headers: {},
    statusText: '',
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

function fakeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    login: vi.fn(async () => auth('login-token')),
    register: vi.fn(async () => auth('register-token')),
    refresh: vi.fn(async () => auth('refreshed-token')),
    logout: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('SessionStore', () => {
  it('shares one in-flight refresh between concurrent callers', async () => {
    const api = fakeApi();
    const store = new SessionStore(api);

    const outcomes = await Promise.all([store.refresh(), store.refresh(), store.refresh()]);

    expect(outcomes).toEqual(['refreshed', 'refreshed', 'refreshed']);
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(store.getAccessToken()).toBe('refreshed-token');
    expect(store.getState().status).toBe('authenticated');
  });

  it('bootstraps to anonymous when there is no valid session', async () => {
    const store = new SessionStore(
      fakeApi({ refresh: vi.fn(async () => Promise.reject(httpError(401))) }),
    );

    await store.bootstrap();

    expect(store.getState()).toEqual({ status: 'anonymous', user: null });
    expect(store.getAccessToken()).toBeNull();
  });

  it('distinguishes an unreachable server from a rejected session', async () => {
    const offline = new SessionStore(
      fakeApi({
        refresh: vi.fn(async () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK'))),
      }),
    );
    const rejected = new SessionStore(
      fakeApi({ refresh: vi.fn(async () => Promise.reject(httpError(401))) }),
    );

    await expect(offline.refresh()).resolves.toBe('unavailable');
    await expect(rejected.refresh()).resolves.toBe('rejected');
  });

  it('surfaces login failures as ApiError with the server message', async () => {
    const store = new SessionStore(
      fakeApi({ login: vi.fn(async () => Promise.reject(httpError(401))) }),
    );

    await expect(store.login({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'The session has expired',
    });
    expect(store.getState().status).toBe('initializing');
  });

  it('clears the session on logout even if the server call fails', async () => {
    const store = new SessionStore(
      fakeApi({ logout: vi.fn(async () => Promise.reject(new Error('offline'))) }),
    );
    await store.login({ email: 'farmer@example.com', password: 'secret' });
    const listener = vi.fn();
    store.subscribe(listener);

    await store.logout();

    expect(store.getState().status).toBe('anonymous');
    expect(store.getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalled();
  });
});
