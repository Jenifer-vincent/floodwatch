/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized API client for the FloodWatch backend.
 *
 * Handles the backend response envelope:
 *   success  -> { success: true,  data: {...} }
 *   failure  -> { success: false, error: { code, message, details } }
 *
 * Identity is always derived server-side from the JWT, never from
 * client-supplied userId/role fields. Errors received from the HTTP
 * layer (network / non-JSON) are normalized into ApiError.
 */

import { ApiError } from '../types';

export const API_BASE_URL = 'http://localhost:8000';

const TOKEN_KEY = 'floodwatch_token_v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function headersWithAuth(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function normalizeHttpError(status: number, bodyText: string): ApiError {
  let message = bodyText || `Request failed with status ${status}.`;
  if (status === 401) message = 'Authentication required. Please log in again.';
  if (status === 403) message = 'You do not have permission to perform this action.';
  if (status >= 500) message = 'The server encountered an error. Please try again.';
  return { code: 'HTTP_ERROR', message, details: { status: String(status) } };
}

function parseBody<T>(raw: Response, payload?: unknown): Promise<T> {
  return raw
    .text()
    .then((text) => {
      if (!text) return null as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    })
    .catch(() => null as T);
}

async function rawRequest<T>(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string>; isFormData?: boolean; allowPublic?: boolean } = {},
): Promise<T> {
  const { body, headers = {}, isFormData = false, allowPublic = false } = options;

  let response: Response;
  let requestInit: RequestInit = { method, headers: isFormData ? headersWithAuth(headers) : headersWithAuth({ 'Content-Type': 'application/json', ...headers }) };

  if (body !== undefined) {
    requestInit.body = isFormData ? (body as BodyInit) : JSON.stringify(body);
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error. Is the backend running?';
    throw { code: 'NETWORK_ERROR', message: `Unable to reach the server: ${message}` } as ApiError;
  }

  const payload = await parseBody<{ success?: boolean; data?: T; error?: ApiError }>(response, body);

  // Public endpoints are reachable without the envelope (e.g. static uploads).
  if (allowPublic && !response.ok && payload && !payload.success) {
    throw payload.error || normalizeHttpError(response.status, '');
  }

  if (response.ok && payload && payload.success) {
    return payload.data as T;
  }

  // Standard API error envelope.
  if (payload && payload.error) {
    throw payload.error;
  }

  if (!response.ok) {
    throw normalizeHttpError(response.status, JSON.stringify(payload ?? {}));
  }

  if (allowPublic) {
    return payload as unknown as T;
  }

  // A well-formed 2xx response without a known envelope shape.
  if (payload && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export const api = {
  get<T>(path: string, options?: { allowPublic?: boolean }): Promise<T> {
    return rawRequest<T>('GET', path, options);
  },

  post<T>(path: string, body?: unknown, options?: { isFormData?: boolean }): Promise<T> {
    return rawRequest<T>('POST', path, { body, isFormData: options?.isFormData });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return rawRequest<T>('PATCH', path, { body });
  },

  del<T>(path: string): Promise<T> {
    return rawRequest<T>('DELETE', path);
  },
};

export function toApiError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    return err as ApiError;
  }
  return { code: 'UNKNOWN_ERROR', message: err instanceof Error ? err.message : 'An unexpected error occurred.' };
}
