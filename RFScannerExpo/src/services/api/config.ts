/**
 * Central API configuration for the Expo app.
 *
 * The Vite RF Scanner currently uses local demo documents — there is no
 * production warehouse API wired in this repository yet.
 *
 * Configure EXPO_PUBLIC_API_BASE_URL for Android devices:
 * - Android emulator → http://10.0.2.2:<port>
 * - Physical device → http://<your-mac-lan-ip>:<port>
 * - Never assume localhost points at your development machine from a phone.
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

export const API_CONFIG = {
  /**
   * Empty string means “demo / offline mode” — no network inventory calls.
   * Set EXPO_PUBLIC_API_BASE_URL when a real backend is available.
   */
  baseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl ?? '').replace(/\/$/, ''),
  timeoutMs: 15000,
  /** Explicit flag so UI can show connection status accurately. */
  get isConfigured(): boolean {
    return Boolean(this.baseUrl);
  },
} as const;

export type ConnectionStatus = 'demo' | 'online' | 'offline' | 'error';
