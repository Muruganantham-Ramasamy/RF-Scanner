import { Platform } from 'react-native';

const TOKEN_KEY = 'rfscanner.auth.token';
const SESSION_KEY = 'rfscanner.auth.session';

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (Platform.OS === 'web') return null;
  if (!secureStorePromise) {
    secureStorePromise = import('expo-secure-store')
      .then((mod) => mod as SecureStoreModule)
      .catch(() => null);
  }
  return secureStorePromise;
}

/** Web fallback — memory only (cleared on refresh). Native uses SecureStore. */
const memoryStore = new Map<string, string>();

async function read(key: string): Promise<string | null> {
  const store = await getSecureStore();
  if (store) return store.getItemAsync(key);
  return memoryStore.get(key) ?? null;
}

async function write(key: string, value: string): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.setItemAsync(key, value);
    return;
  }
  memoryStore.set(key, value);
}

async function remove(key: string): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.deleteItemAsync(key);
    return;
  }
  memoryStore.delete(key);
}

export type PersistedSession = {
  token: string;
  email: string;
  role: string;
  warehouse: string;
  resource: string;
  userId: string;
};

export async function saveAuthSession(session: PersistedSession): Promise<void> {
  await write(TOKEN_KEY, session.token);
  await write(SESSION_KEY, JSON.stringify(session));
}

export async function loadAuthSession(): Promise<PersistedSession | null> {
  const raw = await read(SESSION_KEY);
  const token = await read(TOKEN_KEY);
  if (!raw || !token) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.email || !parsed.role || !parsed.userId) return null;
    return { ...parsed, token };
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  await remove(TOKEN_KEY);
  await remove(SESSION_KEY);
}
