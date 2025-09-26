const rawBaseUrl = import.meta.env.VITE_MIDDLEWARE_BASE_URL ?? 'http://localhost:8080';

export const appConfig = {
  middleware: {
    baseUrl: rawBaseUrl.replace(/\/$/, ''),
    apiKey: import.meta.env.VITE_MIDDLEWARE_API_KEY ?? 'sandbox-secret',
    apiKeyHeader: import.meta.env.VITE_MIDDLEWARE_API_KEY_HEADER ?? 'x-api-key',
    sessionHeader: import.meta.env.VITE_MIDDLEWARE_SESSION_HEADER ?? 'x-session-id'
  }
} as const;
