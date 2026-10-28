import { API_CONFIG } from '@/services/api/config';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type LoginSuccess = {
  token: string;
  user: AuthUser;
};

export type AuthApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function authFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<AuthApiResult<T>> {
  if (!API_CONFIG.isConfigured) {
    return {
      ok: false,
      error:
        'Auth API is not configured. Set EXPO_PUBLIC_API_BASE_URL to your backend (e.g. http://localhost:3001).',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });

    let body: { error?: string; token?: string; user?: AuthUser; ok?: boolean } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      body = {};
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: body.error || `Request failed (${response.status}).`,
      };
    }

    return { ok: true, data: body as T };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out. Check that the auth server is running.'
        : error instanceof Error
          ? error.message
          : 'Network request failed. Check EXPO_PUBLIC_API_BASE_URL and server status.';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthApiResult<LoginSuccess>> {
  return authFetch<LoginSuccess>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function fetchCurrentUser(
  token: string,
): Promise<AuthApiResult<{ user: AuthUser }>> {
  return authFetch<{ user: AuthUser }>('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function pingAdmin(
  token: string,
): Promise<AuthApiResult<{ ok: boolean; message: string }>> {
  return authFetch<{ ok: boolean; message: string }>('/auth/admin/ping', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}
