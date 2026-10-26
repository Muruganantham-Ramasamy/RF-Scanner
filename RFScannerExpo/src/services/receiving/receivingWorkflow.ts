/**
 * Ported from the Vite frontend receivingWorkflowService.
 */

export const DEMO_RECEIVING = {
  purchaseOrder: '4500001234',
  supplier: 'ABC Electronics',
  product: '1000001106',
  batchSerial: 'BATCH1',
  identificationMode: 'batch' as const,
  quantity: '100',
  uom: 'EA',
  destinationBin: '0010-20-27',
} as const;

export type ReceivingIdentificationMode = 'batch' | 'serial' | 'none';

export type ReceivingStepId =
  | 'po'
  | 'supplier'
  | 'product'
  | 'batchSerial'
  | 'quantity'
  | 'destination';

export type ReceivingStepRuntimeStatus = 'verified' | 'current' | 'waiting' | 'failed';

export type ReceivingFailureKind =
  | 'mismatch'
  | 'unreadable'
  | 'blank'
  | 'invalid_quantity'
  | 'excess_quantity'
  | null;

export type ReceivingWorkflowState = {
  verified: readonly ReceivingStepId[];
  current: ReceivingStepId;
  failureKind: ReceivingFailureKind;
  failedValue: string | null;
  complete: boolean;
  identificationMode: ReceivingIdentificationMode;
};

export const RECEIVING_STEP_ORDER: readonly ReceivingStepId[] = [
  'po',
  'supplier',
  'product',
  'batchSerial',
  'quantity',
  'destination',
] as const;

export const EXPECTED_BY_RECEIVING_STEP: Record<ReceivingStepId, string> = {
  po: DEMO_RECEIVING.purchaseOrder,
  supplier: DEMO_RECEIVING.supplier,
  product: DEMO_RECEIVING.product,
  batchSerial: DEMO_RECEIVING.batchSerial,
  quantity: `${DEMO_RECEIVING.quantity} ${DEMO_RECEIVING.uom}`,
  destination: DEMO_RECEIVING.destinationBin,
};

export function normalizeReceivingValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function receivingValuesMatch(scanned: string, expected: string): boolean {
  return normalizeReceivingValue(scanned) === normalizeReceivingValue(expected);
}

/** After PO is accepted, execution starts with PO verified and Supplier current. */
export function createInitialReceivingState(
  identificationMode: ReceivingIdentificationMode = DEMO_RECEIVING.identificationMode,
): ReceivingWorkflowState {
  return {
    verified: ['po'],
    current: 'supplier',
    failureKind: null,
    failedValue: null,
    complete: false,
    identificationMode,
  };
}

/** Fresh state before any PO is accepted (PO is current). */
export function createPrePoReceivingState(
  identificationMode: ReceivingIdentificationMode = DEMO_RECEIVING.identificationMode,
): ReceivingWorkflowState {
  return {
    verified: [],
    current: 'po',
    failureKind: null,
    failedValue: null,
    complete: false,
    identificationMode,
  };
}

export function getReceivingStepStatus(
  state: ReceivingWorkflowState,
  stepId: ReceivingStepId,
): ReceivingStepRuntimeStatus {
  if (state.complete || state.verified.includes(stepId)) return 'verified';
  if (stepId === state.current) {
    return state.failureKind ? 'failed' : 'current';
  }
  return 'waiting';
}

export type ReceivingVerifyResult =
  | { ok: true; state: ReceivingWorkflowState }
  | {
      ok: false;
      state: ReceivingWorkflowState;
      reason: Exclude<ReceivingFailureKind, null>;
    };

function failCurrent(
  state: ReceivingWorkflowState,
  reason: Exclude<ReceivingFailureKind, null>,
  failedValue: string | null,
): ReceivingVerifyResult {
  return {
    ok: false,
    reason,
    state: {
      ...state,
      failureKind: reason,
      failedValue,
    },
  };
}

function advanceAfterSuccess(state: ReceivingWorkflowState): ReceivingVerifyResult {
  const verified = state.verified.includes(state.current)
    ? [...state.verified]
    : [...state.verified, state.current];

  const currentIndex = RECEIVING_STEP_ORDER.indexOf(state.current);
  const next = RECEIVING_STEP_ORDER[currentIndex + 1];

  if (!next) {
    return {
      ok: true,
      state: {
        ...state,
        verified,
        failureKind: null,
        failedValue: null,
        complete: true,
      },
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      verified,
      current: next,
      failureKind: null,
      failedValue: null,
      complete: false,
    },
  };
}

function validateQuantity(raw: string): Exclude<ReceivingFailureKind, null> | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'blank';
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return 'invalid_quantity';
  const num = Number(trimmed);
  if (num === 0 || num < 0) return 'invalid_quantity';
  if (num > Number(DEMO_RECEIVING.quantity)) return 'excess_quantity';
  if (num !== Number(DEMO_RECEIVING.quantity)) return 'mismatch';
  return null;
}

export function verifyReceivingStep(
  state: ReceivingWorkflowState,
  rawValue: string,
): ReceivingVerifyResult {
  if (state.complete) {
    return { ok: true, state };
  }

  const trimmed = rawValue.trim();

  if (state.current === 'quantity') {
    const qtyError = validateQuantity(trimmed);
    if (qtyError === 'blank') {
      return failCurrent(state, 'blank', '');
    }
    if (qtyError) {
      return failCurrent(state, qtyError, trimmed);
    }
    return advanceAfterSuccess(state);
  }

  if (!trimmed) {
    return failCurrent(state, 'blank', '');
  }

  if (state.current === 'batchSerial' && state.identificationMode === 'none') {
    return advanceAfterSuccess(state);
  }

  const expected = EXPECTED_BY_RECEIVING_STEP[state.current];
  if (!receivingValuesMatch(trimmed, expected)) {
    return failCurrent(state, 'mismatch', trimmed);
  }

  return advanceAfterSuccess(state);
}

export function clearReceivingFailure(state: ReceivingWorkflowState): ReceivingWorkflowState {
  return { ...state, failureKind: null, failedValue: null };
}

export function quantityErrorMessage(kind: ReceivingFailureKind): string {
  switch (kind) {
    case 'blank':
      return 'Quantity is required.';
    case 'invalid_quantity':
      return 'Enter a valid quantity greater than zero.';
    case 'excess_quantity':
      return `Excess quantity — expected ${DEMO_RECEIVING.quantity} ${DEMO_RECEIVING.uom}.`;
    case 'mismatch':
      return 'Quantity does not match.';
    default:
      return 'Quantity does not match.';
  }
}
