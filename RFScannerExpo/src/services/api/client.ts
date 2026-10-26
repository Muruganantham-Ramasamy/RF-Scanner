import { API_CONFIG, type ConnectionStatus } from './config';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  if (!API_CONFIG.isConfigured) {
    return {
      ok: false,
      error: 'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL to enable live data.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Request failed (${response.status}).`,
        status: response.status,
      };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out.'
        : error instanceof Error
          ? error.message
          : 'Network request failed.';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export function resolveConnectionStatus(
  probe?: ApiResult<unknown>,
): ConnectionStatus {
  if (!API_CONFIG.isConfigured) return 'demo';
  if (!probe) return 'online';
  if (probe.ok) return 'online';
  return 'offline';
}
