import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchCurrentUser,
  isAdminRole,
  loginWithEmailPassword,
} from '@/services/auth/authApi';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '@/services/auth/secureStorage';

export type SessionUser = {
  userId: string;
  email: string;
  role: string;
  warehouse: string;
  resource: string;
  token: string;
};

type SignInResult = { ok: true } | { ok: false; error: string };

type SessionContextValue = {
  user: SessionUser | null;
  isHydrating: boolean;
  isAdmin: boolean;
  signIn: (input: {
    email: string;
    password: string;
    warehouse: string;
    resource: string;
  }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const persisted = await loadAuthSession();
        if (!persisted) return;

        const me = await fetchCurrentUser(persisted.token);
        if (!me.ok || !me.data.user.is_active) {
          await clearAuthSession();
          return;
        }

        if (cancelled) return;
        setUser({
          userId: me.data.user.id,
          email: me.data.user.email,
          role: me.data.user.role,
          warehouse: persisted.warehouse,
          resource: persisted.resource || me.data.user.email,
          token: persisted.token,
        });
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (input: {
      email: string;
      password: string;
      warehouse: string;
      resource: string;
    }): Promise<SignInResult> => {
      const result = await loginWithEmailPassword(input.email, input.password);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      const { token, user: authUser } = result.data;
      if (!authUser.is_active) {
        return { ok: false, error: 'Account is inactive. Contact an administrator.' };
      }

      const sessionUser: SessionUser = {
        userId: authUser.id,
        email: authUser.email,
        role: authUser.role,
        warehouse: input.warehouse.trim(),
        resource: input.resource.trim() || authUser.email,
        token,
      };

      await saveAuthSession({
        token,
        email: sessionUser.email,
        role: sessionUser.role,
        warehouse: sessionUser.warehouse,
        resource: sessionUser.resource,
        userId: sessionUser.userId,
      });

      setUser(sessionUser);
      return { ok: true };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clearAuthSession();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role: string) => Boolean(user && user.role === role),
    [user],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isHydrating,
      isAdmin: isAdminRole(user?.role),
      signIn,
      signOut,
      hasRole,
    }),
    [user, isHydrating, signIn, signOut, hasRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
