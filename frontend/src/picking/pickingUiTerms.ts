/**
 * Display-only warehouse/SAP terminology + worker-friendly explanations.
 * Does not affect domain validation or scanner behavior.
 */

import type { PickingStepId } from "./pickingWorkflowService";
import { DEMO_PICK, EXPECTED_BY_STEP } from "./pickingWorkflowService";

export type UiTerm = {
  /** Technical / SAP primary label */
  label: string;
  /** Compact label for progress chips */
  shortLabel: string;
  /** Supporting meaning under the simple description */
  meaning: string;
  /** Scan / confirm screen title */
  scanTitle: string;
  /** Plain-language instruction for the worker */
  scanHelper: string;
  /** Mismatch headline */
  mismatchTitle: string;
  /** Short retry hint under mismatch */
  mismatchHint: string;
};

export const PICKING_UI_TERMS: Record<PickingStepId, UiTerm> = {
  wo: {
    label: "Warehouse Order (WO)",
    shortLabel: "WO",
    meaning: "This identifies the picking job to be processed.",
    scanTitle: "Scan Warehouse Order (WO)",
    scanHelper: "Scan the barcode on the warehouse picking order.",
    mismatchTitle: "Incorrect Warehouse Order",
    mismatchHint: "Please scan the correct warehouse order.",
  },
  source: {
    label: "Source Bin (SBin)",
    shortLabel: "SBin",
    meaning: "This confirms where the product should be picked from.",
    scanTitle: "Scan Source Bin (SBin)",
    scanHelper: "Scan the barcode of the bin where the product is currently stored.",
    mismatchTitle: "Incorrect Source Bin",
    mismatchHint: "Please scan the correct source bin.",
  },
  product: {
    label: "Product (Prod.)",
    shortLabel: "Prod.",
    meaning: "This confirms that you are picking the correct product.",
    scanTitle: "Scan Product (Prod.)",
    scanHelper: "Scan the barcode on the product you need to pick.",
    mismatchTitle: "Incorrect Product",
    mismatchHint: "Please scan the correct product.",
  },
  batch: {
    label: "Batch",
    shortLabel: "Batch",
    meaning: "This confirms that the product belongs to the required batch.",
    scanTitle: "Scan Batch",
    scanHelper: "Scan the barcode on the product batch.",
    mismatchTitle: "Incorrect Batch",
    mismatchHint: "Please scan the correct batch.",
  },
  quantity: {
    label: "Quantity (AQty)",
    shortLabel: "AQty",
    meaning: "Confirm that the picked quantity matches the required quantity.",
    scanTitle: "Confirm Quantity (AQty)",
    scanHelper: "Enter the quantity you are picking.",
    mismatchTitle: "Incorrect Quantity",
    mismatchHint: "Please enter the correct quantity.",
  },
  destination: {
    label: "Destination Bin (DstBin)",
    shortLabel: "DstBin",
    meaning: "This confirms the destination location for the picked product.",
    scanTitle: "Scan Destination Bin (DstBin)",
    scanHelper: "Scan the barcode of the bin where the product will be placed.",
    mismatchTitle: "Incorrect Destination Bin",
    mismatchHint: "Please scan the correct destination bin.",
  },
};

export const UOM_UI = {
  label: "UOM",
  meaning: "Unit used to measure the quantity",
  value: DEMO_PICK.uom,
} as const;

export const PICKING_COMPLETE_UI = {
  title: "Picking Complete",
  description: "All required checks have been completed successfully.",
  disclaimer:
    "This is a demonstration workflow. No SAP posting has been performed.",
} as const;

export const CAMERA_ACTIVE_STATUS = "Camera active — point at the barcode" as const;

/** Short success headline shown briefly before auto-advancing. */
export function verifiedSuccessLabel(stepId: PickingStepId): string {
  switch (stepId) {
    case "wo":
      return "✓ Warehouse Order Verified";
    case "source":
      return "✓ Source Bin Verified";
    case "product":
      return "✓ Product Verified";
    case "batch":
      return "✓ Batch Verified";
    case "quantity":
      return "✓ Quantity Confirmed";
    case "destination":
      return "✓ Destination Bin Verified";
  }
}

/** Short line under success flash before auto-opening the next step. */
export function movingToNextLabel(completedStepId: PickingStepId): string {
  const order = ["wo", "source", "product", "batch", "quantity", "destination"] as const;
  const idx = order.indexOf(completedStepId);
  if (idx < 0 || idx >= order.length - 1) {
    return "Moving to Verification Summary...";
  }
  const next = order[idx + 1];
  switch (next) {
    case "source":
      return "Moving to Source Bin...";
    case "product":
      return "Moving to Product...";
    case "batch":
      return "Moving to Batch...";
    case "quantity":
      return "Moving to Quantity...";
    case "destination":
      return "Moving to Destination Bin...";
    default:
      return "Moving to next step...";
  }
}

export const VERIFICATION_SUMMARY_UI = {
  title: "Verification Summary",
  description: "All required checks were completed successfully.",
  continueLabel: "Continue to Complete",
} as const;

/** Steps that show a barcode-style animated scan icon. */
export const BARCODE_SCAN_ICON_STEPS: readonly PickingStepId[] = [
  "wo",
  "source",
  "product",
  "batch",
  "destination",
] as const;

export type RfFieldUi = {
  label: string;
  meaning: string;
  value: string;
};

/** RF document placeholders — values are display-only "Not assigned". */
export const RF_DOCUMENT_FIELDS: readonly RfFieldUi[] = [
  { label: "Pick-HU", meaning: "Handling unit used for picking", value: "Not assigned" },
  { label: "SrcHU", meaning: "Handling unit at the source", value: "Not assigned" },
  { label: "DestHU", meaning: "Handling unit at the destination", value: "Not assigned" },
  { label: "Pack Mat", meaning: "Packaging material", value: "Not assigned" },
  { label: "LP", meaning: "License plate / handling-unit identifier", value: "Not assigned" },
  { label: "PlnHUs", meaning: "Planned handling units", value: "Not assigned" },
  { label: "ActHUs", meaning: "Actual handling units", value: "Not assigned" },
  { label: "HUWh", meaning: "Handling unit warehouse information", value: "Not assigned" },
  { label: "LogPos", meaning: "Item position", value: "Not assigned" },
] as const;

export function pickingDisplayValue(stepId: PickingStepId): string {
  if (stepId === "quantity") {
    return `${DEMO_PICK.quantity} ${DEMO_PICK.uom}`;
  }
  return EXPECTED_BY_STEP[stepId];
}

export function expectedValueLabel(stepId: PickingStepId): string {
  return `Expected ${PICKING_UI_TERMS[stepId].label}`;
}

/** Inbound / purchasing display terms (for future UI; no workflow wired yet). */
export const INBOUND_UI_TERMS = {
  po: {
    label: "Purchase Order (PO)",
    meaning: "Order placed with the supplier",
  },
  supplier: {
    label: "Supplier",
    meaning: "Company providing the material",
  },
  product: {
    label: "Product (Prod.)",
    meaning: "Product being received",
  },
  batchSerial: {
    label: "Batch / Serial",
    meaning: "Batch or serial identification of the material",
  },
  quantity: {
    label: "Quantity",
    meaning: "Amount received",
  },
  destination: {
    label: "Destination Bin (DstBin)",
    meaning: "Bin where the received product is stored",
  },
  goodsReceipt: {
    label: "Goods Receipt (GR)",
    meaning: "Receiving confirmation for the delivered material",
  },
} as const;
