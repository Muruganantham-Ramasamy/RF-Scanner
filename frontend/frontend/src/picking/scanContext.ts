/**
 * Scan titles/instructions for the current picking step.
 * Display-only — does not validate barcodes.
 */

import type { PickingStepId } from "./pickingWorkflowService";
import { PICKING_UI_TERMS } from "./pickingUiTerms";

export type ScanContext = {
  stepId: PickingStepId;
  title: string;
  instruction: string;
};

export function getScanContext(stepId: PickingStepId): ScanContext {
  const term = PICKING_UI_TERMS[stepId];
  return {
    stepId,
    title: term.scanTitle,
    instruction: term.scanHelper,
  };
}

export function isBarcodeScanStep(stepId: PickingStepId): boolean {
  return stepId !== "quantity";
}

/** Whether the continuous camera UX should auto-activate for this step. */
export function shouldAutoStartCamera(
  stepId: PickingStepId,
  options: { complete?: boolean; showManual?: boolean } = {},
): boolean {
  if (options.complete || options.showManual) return false;
  return isBarcodeScanStep(stepId);
}
