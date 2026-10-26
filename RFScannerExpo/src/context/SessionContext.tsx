import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type SessionUser = {
  warehouse: string;
  resource: string;
};

type SessionContextValue = {
  user: SessionUser | null;
  signIn: (warehouse: string, resource: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      signIn: (warehouse, resource) =>
        setUser({ warehouse: warehouse.trim(), resource: resource.trim() }),
      signOut: () => setUser(null),
    }),
    [user],
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
