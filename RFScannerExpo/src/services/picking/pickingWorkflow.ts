/**
 * Ported from the Vite frontend pickingWorkflowService.
 * Pure TypeScript — safe for React Native.
 */

import {
  DEMO_REQUIRED_VERIFICATION_STEPS,
  expectedBarcodeForStep,
  getActivePickingDocument,
  type PickingDocument,
  type VerificationStepId,
} from './pickingDataSource';

export type PickingStepId = VerificationStepId;
export type StepRuntimeStatus = 'verified' | 'current' | 'waiting' | 'failed';
export type StepFailureKind = 'mismatch' | 'unreadable' | 'blank' | null;

export type PickingWorkflowState = {
  verified: readonly PickingStepId[];
  current: PickingStepId;
  stepOrder: readonly PickingStepId[];
  failureKind: StepFailureKind;
  failedValue: string | null;
  complete: boolean;
  verifiedAt?: Partial<Record<PickingStepId, number>>;
  verifiedValues?: Partial<Record<PickingStepId, string>>;
};

export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function barcodesMatch(scanned: string, expected: string): boolean {
  return normalizeBarcode(scanned) === normalizeBarcode(expected);
}

export type CreatePickingStateOptions = {
  document?: PickingDocument;
  requiredSteps?: readonly PickingStepId[];
  alreadyVerified?: Partial<Record<PickingStepId, string>>;
};

export function createInitialPickingState(
  options: CreatePickingStateOptions = {},
): PickingWorkflowState {
  const document = options.document ?? getActivePickingDocument();
  const stepOrder =
    options.requiredSteps ??
    document.requiredVerificationSteps ??
    DEMO_REQUIRED_VERIFICATION_STEPS;
  const alreadyVerified = options.alreadyVerified ?? {};
  const now = Date.now();
  const verified = stepOrder.filter((id) => Boolean(alreadyVerified[id]));
  const verifiedValues: Partial<Record<PickingStepId, string>> = {};
  const verifiedAt: Partial<Record<PickingStepId, number>> = {};
  for (const id of verified) {
    verifiedValues[id] = alreadyVerified[id]!;
    verifiedAt[id] = now;
  }
  const first = stepOrder.find((id) => !alreadyVerified[id]) ?? stepOrder[0] ?? 'source';

  return {
    verified,
    current: first,
    stepOrder: [...stepOrder],
    failureKind: null,
    failedValue: null,
    complete: verified.length > 0 && verified.length >= stepOrder.length,
    verifiedValues,
    verifiedAt,
  };
}

export function getStepStatus(
  state: PickingWorkflowState,
  stepId: PickingStepId,
): StepRuntimeStatus {
  if (state.complete || state.verified.includes(stepId)) return 'verified';
  if (stepId === state.current) {
    return state.failureKind ? 'failed' : 'current';
  }
  return 'waiting';
}

type StepValidationResult =
  | { ok: true; displayValue: string }
  | { ok: false; reason: Exclude<StepFailureKind, null>; failedValue: string };

function validateStepInput(
  stepId: PickingStepId,
  rawValue: string,
  document: PickingDocument,
): StepValidationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: false, reason: 'blank', failedValue: '' };
  }

  if (stepId === 'quantity') {
    const expectedQty = document.barcodes.quantity;
    if (!/^\d+(\.\d+)?$/.test(trimmed) || Number(trimmed) !== Number(expectedQty)) {
      return {
        ok: false,
        reason: 'mismatch',
        failedValue: `${trimmed} ${document.uom}`,
      };
    }
    return { ok: true, displayValue: `${trimmed} ${document.uom}` };
  }

  const expected = expectedBarcodeForStep(stepId, document);
  if (!barcodesMatch(trimmed, expected)) {
    return { ok: false, reason: 'mismatch', failedValue: trimmed };
  }

  return { ok: true, displayValue: normalizeBarcode(trimmed) };
}

export type VerifyResult =
  | { ok: true; state: PickingWorkflowState }
  | { ok: false; state: PickingWorkflowState; reason: Exclude<StepFailureKind, null> };

export function verifyCurrentStep(
  state: PickingWorkflowState,
  rawValue: string,
  document: PickingDocument = getActivePickingDocument(),
): VerifyResult {
  if (state.complete) {
    return { ok: true, state };
  }

  const validation = validateStepInput(state.current, rawValue, document);
  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason,
      state: {
        ...state,
        failureKind: validation.reason,
        failedValue: validation.failedValue,
      },
    };
  }

  const verified = state.verified.includes(state.current)
    ? [...state.verified]
    : [...state.verified, state.current];
  const verificationRecord = {
    verifiedAt: { ...state.verifiedAt, [state.current]: Date.now() },
    verifiedValues: { ...state.verifiedValues, [state.current]: validation.displayValue },
  };

  const order = state.stepOrder.length > 0 ? state.stepOrder : DEMO_REQUIRED_VERIFICATION_STEPS;
  const idx = order.indexOf(state.current);
  const isLast = idx < 0 || idx >= order.length - 1;

  if (isLast) {
    return {
      ok: true,
      state: {
        ...state,
        ...verificationRecord,
        verified,
        current: state.current,
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
      ...verificationRecord,
      verified,
      current: order[idx + 1],
      failureKind: null,
      failedValue: null,
      complete: false,
    },
  };
}

export function clearStepFailure(state: PickingWorkflowState): PickingWorkflowState {
  return { ...state, failureKind: null, failedValue: null };
}

export function markUnreadableFailure(state: PickingWorkflowState): PickingWorkflowState {
  if (state.complete) return state;
  return { ...state, failureKind: 'unreadable', failedValue: null };
}
