import { appConfig } from '../config';
import { getSessionId } from '../lib/session';

export interface HttpError extends Error {
  status: number;
  details?: unknown;
}

async function parseError(response: Response): Promise<HttpError> {
  let details: unknown;
  try {
    details = await response.json();
  } catch {
    try {
      details = await response.text();
    } catch {
      details = null;
    }
  }
  const error = new Error(
    `Middleware request failed: ${response.status} ${response.statusText}`
  ) as HttpError;
  error.status = response.status;
  error.details = details;
  return error;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${appConfig.middleware.baseUrl}${path}`;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  headers.set(appConfig.middleware.apiKeyHeader, appConfig.middleware.apiKey);
  headers.set(appConfig.middleware.sessionHeader, getSessionId());

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
