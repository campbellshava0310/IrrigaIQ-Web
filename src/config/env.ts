/** Runtime configuration. Everything here is public: it ships in the browser bundle. */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  /** Tells the API to return the refresh token as an HttpOnly cookie instead of in the body. */
  clientType: 'web',
} as const;
