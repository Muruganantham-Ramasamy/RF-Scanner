/**
 * Sequential picking verification workflow.
 * Step order and expected values are data-driven from pickingDataSource
 * so SAP can later supply documents + required steps without a UI rewrite.
 */

export { DEMO_PICK } from "./pickingDataSource";
import {
  DEMO_PICK,
  DEMO_REQUIRED_VERIFICATION_STEPS,
  expectedBarcodeForStep,
  getActivePickingDocument,
  type PickingDocument,
  type VerificationStepId,
} from "./pickingDataSource";

export type PickingStepId = VerificationStepId;

export type StepRuntimeStatus = "verified" | "current" | "waiting" | "failed";

export type StepFailureKind = "mismatch" | "unreadable" | "blank" | null;

export type PickingWorkflowState = {
  /** Steps that have successfully passed validation — never cleared on failure. */
  verified: readonly PickingStepId[];
  /** The only step that accepts input. */
  current: PickingStepId;
  /** Ordered required verification steps for this operation (from document / SAP). */
  stepOrder: readonly PickingStepId[];
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

/** Full catalog of possible verification steps (not all are required every time). */
export const PICKING_STEP_ORDER: readonly PickingStepId[] = [
  "wo",
  "source",
  "product",
  "batch",
  "quantity",
  "destination",
] as const;

/** @deprecated Prefer expectedBarcodeForStep(document) — kept for existing UI helpers. */
export const EXPECTED_BY_STEP: Record<PickingStepId, string> = {
  wo: expectedBarcodeForStep("wo"),
  source: expectedBarcodeForStep("source"),
  product: expectedBarcodeForStep("product"),
  batch: expectedBarcodeForStep("batch"),
  quantity: expectedBarcodeForStep("quantity"),
  destination: expectedBarcodeForStep("destination"),
};

export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function barcodesMatch(scanned: string, expected: string): boolean {
  return normalizeBarcode(scanned) === normalizeBarcode(expected);
}

export type CreatePickingStateOptions = {
  document?: PickingDocument;
  /** Override required steps (defaults to document.requiredVerificationSteps). */
  requiredSteps?: readonly PickingStepId[];
  /**
   * Steps already completed before Start Picking (e.g. Warehouse Order scanned
   * on the dedicated WO gate screen). Those steps are marked verified and skipped.
   */
  alreadyVerified?: Partial<Record<PickingStepId, string>>;
};

/**
 * Start Picking begins at the first *required* verification step that is not
 * already verified. For Picking by WO the Warehouse Order is scanned first,
 * then Picking Details, then the remaining scanners.
 * RF Document Fields are display-only unless included in requiredSteps.
 */
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
  const first = stepOrder.find((id) => !alreadyVerified[id]) ?? stepOrder[0] ?? "source";

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

function validateStepInput(
  stepId: PickingStepId,
  rawValue: string,
  document: PickingDocument = getActivePickingDocument(),
): StepValidationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: false, reason: "blank", failedValue: "" };
  }

  if (stepId === "quantity") {
    const expectedQty = document.barcodes.quantity;
    if (!/^\d+(\.\d+)?$/.test(trimmed) || Number(trimmed) !== Number(expectedQty)) {
      return {
        ok: false,
        reason: "mismatch",
        failedValue: `${trimmed} ${document.uom}`,
      };
    }
    return { ok: true, displayValue: `${trimmed} ${document.uom}` };
  }

  const expected = expectedBarcodeForStep(stepId, document);
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
 * Advances only through `state.stepOrder` (required fields from the document).
 */
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
  const verificationRecord = recordStepVerification(state, state.current, validation.displayValue);

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
