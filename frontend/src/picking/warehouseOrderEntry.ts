/**
 * Warehouse Order (WO) entry validation for Picking by WO.
 * Camera/manual only supply raw values; this controller validates the WO.
 */

import { barcodesMatch, DEMO_PICK } from "./pickingWorkflowService";
import { safeBarcodeScanner } from "./safeBarcodeScanner";

export type WarehouseOrderValidation =
  | { ok: true; value: string }
  | {
      ok: false;
      reason: "blank" | "not_found";
      message: string;
      value?: string;
    };

/** Validate a raw WO barcode / typed value against the known demo order. */
export function validateWarehouseOrder(
  raw: unknown,
  expectedWo: string = DEMO_PICK.wo,
): WarehouseOrderValidation {
  const captured = safeBarcodeScanner(raw);
  if (!captured.ok) {
    return {
      ok: false,
      reason: "blank",
      message: "Warehouse Order is required.",
    };
  }

  if (!barcodesMatch(captured.value, expectedWo)) {
    return {
      ok: false,
      reason: "not_found",
      message: "Warehouse Order not found.",
      value: captured.value,
    };
  }

  return { ok: true, value: captured.value };
}

/**
 * Controller façade used by the Scan WO screen.
 * Keeps WO rules out of the camera scanner.
 */
export const WarehouseOrderEntryController = {
  expectedWo: DEMO_PICK.wo,
  /** Manual field must start empty — never pre-fill the expected WO. */
  emptyManualValue(): string {
    return "";
  },
  validate(raw: unknown): WarehouseOrderValidation {
    return validateWarehouseOrder(raw, DEMO_PICK.wo);
  },
  shouldAutoStartCamera(options: {
    verified?: boolean;
    showManual?: boolean;
  }): boolean {
    if (options.verified || options.showManual) return false;
    return true;
  },
};
