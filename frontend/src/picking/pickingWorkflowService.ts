/** Demo RF document values used by the Warehouse RF picking UI. */
export const DEMO_PICK = {
  wo: "200028",
  sourceBin: "0010-20-27",
  product: "1000001106",
  batch: "BATCH1",
  quantity: "2",
  uom: "EA",
  destinationBin: "9020 0001 GI-ZONE",
} as const;

export type PickingStepId =
  | "wo"
  | "source"
  | "product"
  | "batch"
  | "quantity"
  | "destination";

export type StepRuntimeStatus = "verified" | "current" | "waiting" | "failed";

export type StepFailureKind = "mismatch" | "unreadable" | "blank" | null;

export type PickingWorkflowState = {
  /** Steps that have successfully passed validation — never cleared on failure. */
  verified: readonly PickingStepId[];
  /** The only step that accepts input. */
  current: PickingStepId;
  /** Failure on the current step only; does not reset verified steps. */
  failureKind: StepFailureKind;
  /** Raw scanned/entered value that failed (when applicable). */
  failedValue: string | null;
  complete: boolean;
  /** Millisecond timestamps recorded when each step was verified. */
  verifiedAt?: Partial<Record<PickingStepId, number>>;
  /** Display values captured at verification time. */
  verifiedValues?: Partial<Record<PickingStepId, string>>;
};

export const PICKING_STEP_ORDER: readonly PickingStepId[] = [
  "wo",
  "source",
  "product",
  "batch",
  "quantity",
  "destination",
] as const;

export const EXPECTED_BY_STEP: Record<PickingStepId, string> = {
  wo: DEMO_PICK.wo,
  source: DEMO_PICK.sourceBin,
  product: DEMO_PICK.product,
  batch: DEMO_PICK.batch,
  quantity: `${DEMO_PICK.quantity} ${DEMO_PICK.uom}`,
  destination: DEMO_PICK.destinationBin,
};

export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function barcodesMatch(scanned: string, expected: string): boolean {
  return normalizeBarcode(scanned) === normalizeBarcode(expected);
}

/** After Scan WO succeeds, execution starts with WO verified and Source Bin current. */
export function createInitialPickingState(): PickingWorkflowState {
  return {
    verified: ["wo"],
    current: "source",
    failureKind: null,
    failedValue: null,
    complete: false,
    verifiedValues: { wo: DEMO_PICK.wo },
    verifiedAt: { wo: Date.now() },
  };
}

export function getStepStatus(
  state: PickingWorkflowState,
  stepId: PickingStepId,
): StepRuntimeStatus {
  if (state.complete || state.verified.includes(stepId)) return "verified";
  if (stepId === state.current) {
    return state.failureKind ? "failed" : "current";
  }
  return "waiting";
}

export function formatVerifiedTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function getVerifiedDisplayValue(
  state: PickingWorkflowState,
  stepId: PickingStepId,
): string | null {
  if (state.verifiedValues?.[stepId]) return state.verifiedValues[stepId]!;
  if (state.verified.includes(stepId) || state.complete) {
    return EXPECTED_BY_STEP[stepId];
  }
  return null;
}

type StepValidationResult =
  | { ok: true; displayValue: string }
  | { ok: false; reason: Exclude<StepFailureKind, null>; failedValue: string };

function validateStepInput(stepId: PickingStepId, rawValue: string): StepValidationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: false, reason: "blank", failedValue: "" };
  }

  if (stepId === "quantity") {
    if (!/^\d+(\.\d+)?$/.test(trimmed) || Number(trimmed) !== Number(DEMO_PICK.quantity)) {
      return {
        ok: false,
        reason: "mismatch",
        failedValue: `${trimmed} ${DEMO_PICK.uom}`,
      };
    }
    return { ok: true, displayValue: `${trimmed} ${DEMO_PICK.uom}` };
  }

  const expected = EXPECTED_BY_STEP[stepId];
  if (!barcodesMatch(trimmed, expected)) {
    return { ok: false, reason: "mismatch", failedValue: trimmed };
  }

  return { ok: true, displayValue: normalizeBarcode(trimmed) };
}

function recordStepVerification(
  state: PickingWorkflowState,
  stepId: PickingStepId,
  displayValue: string,
): Pick<PickingWorkflowState, "verifiedAt" | "verifiedValues"> {
  return {
    verifiedAt: { ...state.verifiedAt, [stepId]: Date.now() },
    verifiedValues: { ...state.verifiedValues, [stepId]: displayValue },
  };
}

export type VerifyResult =
  | { ok: true; state: PickingWorkflowState }
  | { ok: false; state: PickingWorkflowState; reason: Exclude<StepFailureKind, null> };

/**
 * Validates a raw barcode/manual value for the CURRENT step only.
 * On failure: keeps verified steps intact and keeps the same current step.
 * On success: marks current verified and advances to the next step (or completes).
 */
export function verifyCurrentStep(
  state: PickingWorkflowState,
  rawValue: string,
): VerifyResult {
  if (state.complete) {
    return { ok: true, state };
  }

  const validation = validateStepInput(state.current, rawValue);
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
  const verificationRecord = recordStepVerification(state, state.current, validation.displayValue);

  const idx = PICKING_STEP_ORDER.indexOf(state.current);
  const isLast = idx >= PICKING_STEP_ORDER.length - 1;

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
      current: PICKING_STEP_ORDER[idx + 1],
      failureKind: null,
      failedValue: null,
      complete: false,
    },
  };
}

/** Camera could not read a barcode — current step fails, workflow does not reset. */
export function markUnreadableFailure(state: PickingWorkflowState): PickingWorkflowState {
  if (state.complete) return state;
  return {
    ...state,
    failureKind: "unreadable",
    failedValue: null,
  };
}

/** Clear failure UI so the user can retry the SAME current step. */
export function clearStepFailure(state: PickingWorkflowState): PickingWorkflowState {
  return {
    ...state,
    failureKind: null,
    failedValue: null,
  };
}

/** Camera cancel: no step change, no reset. */
export function cancelCameraScan(state: PickingWorkflowState): PickingWorkflowState {
  return clearStepFailure(state);
}

export function isStepVerified(state: PickingWorkflowState, stepId: PickingStepId): boolean {
  return state.verified.includes(stepId) || state.complete;
}
