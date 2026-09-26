import { isAxiosError } from 'axios';

import { toApiError } from '@/lib/api/errors';

import { authApi, type AuthApi } from './authApi';
import type { AuthResponse, CurrentUser, LoginCredentials, Registration } from './types';

export type SessionState =
  | { status: 'initializing'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: CurrentUser };

/**
 * - `refreshed`: a new access token is available
 * - `rejected`: the server refused the session; the user must sign in again
 * - `unavailable`: the server could not be reached; keep the session and let the caller fail
 */
export type RefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

type AuthMessage = { type: 'login' } | { type: 'logout' };

const REFRESH_LOCK = 'irrigaiq:token-refresh';
const CHANNEL = 'irrigaiq:auth';

/**
 * Browser session. The access token lives only in memory (never localStorage) so injected
 * scripts cannot lift a long-lived credential; the refresh token is an HttpOnly cookie managed by
 * the browser. A page reload restores the session through a silent refresh.
 *
 * All tabs share one refresh cookie and the API rotates it on every use, so refreshes are
 * single-flight within a tab and serialised across tabs with the Web Locks API. Sign-in and
 * sign-out are broadcast so every tab follows.
 */
export class SessionStore {
  #state: SessionState = { status: 'initializing', user: null };
  #accessToken: string | null = null;
  #refreshing: Promise<RefreshOutcome> | null = null;
  #bootstrap: Promise<void> | null = null;
  readonly #listeners = new Set<() => void>();
  readonly #channel: BroadcastChannel | null;
  readonly #api: AuthApi;

  constructor(api: AuthApi = authApi) {
    this.#api = api;
    this.#channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
    this.#channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
      if (event.data.type === 'logout') {
        this.#clear();
      } else if (event.data.type === 'login' && this.#state.status !== 'authenticated') {
        void this.refresh();
      }
    });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = (): SessionState => this.#state;

  getAccessToken = (): string | null => this.#accessToken;

  /** Restores the session from the refresh cookie. Safe to call repeatedly. */
  bootstrap = (): Promise<void> => {
    this.#bootstrap ??= this.refresh().then((outcome) => {
      if (outcome !== 'refreshed') {
        this.#set({ status: 'anonymous', user: null });
      }
    });
    return this.#bootstrap;
  };

  login = async (credentials: LoginCredentials): Promise<CurrentUser> => {
    return this.#authenticate(() => this.#api.login(credentials));
  };

  register = async (registration: Registration): Promise<CurrentUser> => {
    return this.#authenticate(() => this.#api.register(registration));
  };

  logout = async (): Promise<void> => {
    try {
      await this.#api.logout();
    } catch {
      // The local session ends regardless; the server session expires on its own.
    } finally {
      this.#clear();
      this.#broadcast({ type: 'logout' });
    }
  };

  refresh = (): Promise<RefreshOutcome> => {
    this.#refreshing ??= withCrossTabLock(() => this.#api.refresh())
      .then((response): RefreshOutcome => {
        this.#establish(response);
        return 'refreshed';
      })
      .catch((error: unknown): RefreshOutcome => {
        const unreachable = isAxiosError(error) && !error.response;
        return unreachable ? 'unavailable' : 'rejected';
      })
      .finally(() => {
        this.#refreshing = null;
      });
    return this.#refreshing;
  };

  /** Called when the API refuses to refresh: the session is over in this and every other tab. */
  expire = (): void => {
    if (this.#state.status === 'authenticated') {
      this.#clear();
      this.#broadcast({ type: 'logout' });
    }
  };

  updateUser = (user: CurrentUser): void => {
    if (this.#state.status === 'authenticated') {
      this.#set({ status: 'authenticated', user });
    }
  };

  async #authenticate(call: () => Promise<AuthResponse>): Promise<CurrentUser> {
    try {
      const response = await call();
      this.#establish(response);
      this.#broadcast({ type: 'login' });
      return response.user;
    } catch (error) {
      throw toApiError(error);
    }
  }

  #establish(response: AuthResponse): void {
    this.#accessToken = response.accessToken;
    this.#set({ status: 'authenticated', user: response.user });
  }

  #clear(): void {
    this.#accessToken = null;
    this.#set({ status: 'anonymous', user: null });
  }

  #set(state: SessionState): void {
    this.#state = state;
    this.#listeners.forEach((listener) => listener());
  }

  #broadcast(message: AuthMessage): void {
    this.#channel?.postMessage(message);
  }
}

function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK, task) as Promise<T>;
  }
  return task();
}

export const session = new SessionStore();
