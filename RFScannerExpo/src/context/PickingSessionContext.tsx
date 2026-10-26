/**
 * Port of pickingRouteGuard + pickingMethod session from frontend/src/App.tsx.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  getPickingMethodMeta,
  type PickingMethodId,
} from '@/services/picking/pickingDataSource';

export type PickingSessionGate = {
  woVerified: boolean;
  verifiedWo: string | null;
};

type PickingSessionValue = {
  method: PickingMethodId;
  flowTitle: string;
  gate: PickingSessionGate;
  setMethod: (method: PickingMethodId) => void;
  resetGate: () => void;
  markWoVerified: (wo: string) => void;
  /** WO gate value for execution — only by-wo uses dedicated scan-wo verification. */
  verifiedWoForExecution: string | null;
};

const PickingSessionContext = createContext<PickingSessionValue | null>(null);

function emptyGate(): PickingSessionGate {
  return { woVerified: false, verifiedWo: null };
}

export function PickingSessionProvider({ children }: { children: ReactNode }) {
  const [method, setMethodState] = useState<PickingMethodId>('by-wo');
  const [gate, setGate] = useState<PickingSessionGate>(emptyGate);

  const value = useMemo<PickingSessionValue>(
    () => ({
      method,
      flowTitle: getPickingMethodMeta(method).flowTitle,
      gate,
      setMethod: (next) => {
        setMethodState(next);
        setGate(emptyGate());
      },
      resetGate: () => setGate(emptyGate()),
      markWoVerified: (wo) =>
        setGate({ woVerified: true, verifiedWo: wo }),
      verifiedWoForExecution: method === 'by-wo' ? gate.verifiedWo : null,
    }),
    [method, gate],
  );

  return (
    <PickingSessionContext.Provider value={value}>{children}</PickingSessionContext.Provider>
  );
}

export function usePickingSession(): PickingSessionValue {
  const ctx = useContext(PickingSessionContext);
  if (!ctx) {
    throw new Error('usePickingSession must be used within PickingSessionProvider');
  }
  return ctx;
}

export function canEnterPickingDetails(gate: PickingSessionGate, method: PickingMethodId): boolean {
  if (method !== 'by-wo') return true;
  return gate.woVerified === true && Boolean(gate.verifiedWo);
}
