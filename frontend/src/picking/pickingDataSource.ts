/**
 * Picking document data source.
 *
 * Demo/mock values power the current UI. Production RF barcodes, document
 * fields, and required verification steps will later be supplied by SAP —
 * replace `getActivePickingDocument` without rewriting the UI or scanner.
 *
 * Do not hardcode production SAP barcode-generation logic here.
 */

export type PickingMethodId =
  | "system-guided"
  | "queue"
  | "by-wr"
  | "by-wo"
  | "by-hu";

/** Fields that can become scanner verification steps. */
export type VerificationStepId =
  | "wo"
  | "source"
  | "product"
  | "batch"
  | "quantity"
  | "destination";

export type RfDocumentField = {
  id: string;
  label: string;
  meaning: string;
  value: string;
};

/** Canonical pick document — display fields + barcodes + required steps. */
export type PickingDocument = {
  wo: string;
  sourceBin: string;
  product: string;
  batch: string;
  quantity: string;
  uom: string;
  destinationBin: string;
  /**
   * RF barcode values the scanner validates against.
   * Today these mirror the demo fields; SAP can populate them independently later.
   */
  barcodes: {
    wo: string;
    sourceBin: string;
    product: string;
    batch: string;
    quantity: string;
    destinationBin: string;
  };
  /** Display-only RF document attributes (not scanned unless added to requiredSteps). */
  rfFields: readonly RfDocumentField[];
  /**
   * Which fields require sequential scanner/manual verification for this operation.
   * SAP can replace this list later. RF Document Fields are NOT included by default.
   */
  requiredVerificationSteps: readonly VerificationStepId[];
};

export type PickingMethodMeta = {
  id: PickingMethodId;
  label: string;
  sub: string;
  flowTitle: string;
};

export type PickingDetailRow = {
  key: string;
  label: string;
  value: string;
  /** Optional verification step linkage for complete-screen status. */
  stepId?: VerificationStepId;
  /** true for RF document attribute rows (display-only in demo). */
  isRfField?: boolean;
};

const DEMO_RF_FIELDS: readonly RfDocumentField[] = [
  { id: "pickHu", label: "Pick-HU", meaning: "Handling unit used for picking", value: "Not assigned" },
  { id: "srcHu", label: "SrcHU", meaning: "Handling unit at the source", value: "Not assigned" },
  { id: "destHu", label: "DestHU", meaning: "Handling unit at the destination", value: "Not assigned" },
  { id: "packMat", label: "Pack Mat", meaning: "Packaging material", value: "Not assigned" },
  { id: "lp", label: "LP", meaning: "License plate / handling-unit identifier", value: "Not assigned" },
  { id: "plnHus", label: "PlnHUs", meaning: "Planned handling units", value: "Not assigned" },
  { id: "actHus", label: "ActHUs", meaning: "Actual handling units", value: "Not assigned" },
  { id: "huWh", label: "HUWh", meaning: "Handling unit warehouse information", value: "Not assigned" },
  { id: "logPos", label: "LogPos", meaning: "Item position", value: "Not assigned" },
];

/**
 * Full required verification sequence for a pick document.
 * Picking by WO scans Warehouse Order first, then shows Picking Details.
 * Start Picking then runs the remaining scanners:
 * SBin → Product → Batch → Quantity → DstBin.
 * RF Document Fields stay on the details table but are not scanned.
 * SAP can replace this list later without redesigning the UI.
 */
export const DEMO_REQUIRED_VERIFICATION_STEPS: readonly VerificationStepId[] = [
  "wo",
  "source",
  "product",
  "batch",
  "quantity",
  "destination",
] as const;

/** Demo picking document — replaceable by SAP-provided data later. */
export const DEMO_PICKING_DOCUMENT: PickingDocument = {
  wo: "200028",
  sourceBin: "0010-20-27",
  product: "1000001106",
  batch: "BATCH1",
  quantity: "2",
  uom: "EA",
  destinationBin: "9020 0001 GI-ZONE",
  barcodes: {
    wo: "200028",
    sourceBin: "0010-20-27",
    product: "1000001106",
    batch: "BATCH1",
    quantity: "2",
    destinationBin: "9020 0001 GI-ZONE",
  },
  rfFields: DEMO_RF_FIELDS,
  requiredVerificationSteps: DEMO_REQUIRED_VERIFICATION_STEPS,
};

export const PICKING_METHODS: readonly PickingMethodMeta[] = [
  { id: "system-guided", label: "Picking System Guided", sub: "", flowTitle: "Picking System Guided" },
  { id: "queue", label: "System Guided by Queue", sub: "", flowTitle: "System Guided by Queue" },
  { id: "by-wr", label: "Picking by WR", sub: "WAREHOUSE REQUEST", flowTitle: "Picking by WR" },
  { id: "by-wo", label: "Picking by WO", sub: "WAREHOUSE ORDER", flowTitle: "Picking by WO" },
  { id: "by-hu", label: "Picking by HU", sub: "HANDLING UNIT", flowTitle: "Picking by HU" },
] as const;

export function getPickingMethodMeta(method: PickingMethodId): PickingMethodMeta {
  return PICKING_METHODS.find((m) => m.id === method) ?? PICKING_METHODS.find((m) => m.id === "by-wo")!;
}

/**
 * Active picking document for the session.
 * All Outbound methods share one reusable document shape today.
 * Swap this implementation to read SAP payloads when integration is ready.
 */
export function getActivePickingDocument(
  _method: PickingMethodId = "by-wo",
): PickingDocument {
  return DEMO_PICKING_DOCUMENT;
}

export function getRequiredVerificationSteps(
  document: PickingDocument = DEMO_PICKING_DOCUMENT,
): readonly VerificationStepId[] {
  return document.requiredVerificationSteps;
}

/** Flattened demo shape used by the existing workflow service. */
export const DEMO_PICK = {
  wo: DEMO_PICKING_DOCUMENT.wo,
  sourceBin: DEMO_PICKING_DOCUMENT.sourceBin,
  product: DEMO_PICKING_DOCUMENT.product,
  batch: DEMO_PICKING_DOCUMENT.batch,
  quantity: DEMO_PICKING_DOCUMENT.quantity,
  uom: DEMO_PICKING_DOCUMENT.uom,
  destinationBin: DEMO_PICKING_DOCUMENT.destinationBin,
} as const;

/**
 * Consolidated Picking Details rows: main WO fields first, then RF Document Fields.
 * Values come from the document — not hardcoded in the UI.
 */
export function getConsolidatedPickingDetailRows(
  document: PickingDocument = DEMO_PICKING_DOCUMENT,
): PickingDetailRow[] {
  const main: PickingDetailRow[] = [
    { key: "wo", label: "Warehouse Order (WO)", value: document.wo, stepId: "wo" },
    { key: "source", label: "Source Bin (SBin)", value: document.sourceBin, stepId: "source" },
    { key: "product", label: "Product (Prod.)", value: document.product, stepId: "product" },
    { key: "batch", label: "Batch", value: document.batch, stepId: "batch" },
    {
      key: "quantity",
      label: "Quantity (AQty)",
      value: `${document.quantity} ${document.uom}`,
      stepId: "quantity",
    },
    { key: "uom", label: "UOM", value: document.uom },
    {
      key: "destination",
      label: "Destination Bin (DstBin)",
      value: document.destinationBin,
      stepId: "destination",
    },
  ];

  const rf: PickingDetailRow[] = document.rfFields.map((f) => ({
    key: f.id,
    label: f.label,
    value: f.value,
    isRfField: true,
  }));

  return [...main, ...rf];
}

/** Expected barcode/display value for a verification step from the document. */
export function expectedBarcodeForStep(
  stepId: VerificationStepId,
  document: PickingDocument = DEMO_PICKING_DOCUMENT,
): string {
  switch (stepId) {
    case "wo":
      return document.barcodes.wo;
    case "source":
      return document.barcodes.sourceBin;
    case "product":
      return document.barcodes.product;
    case "batch":
      return document.barcodes.batch;
    case "quantity":
      return `${document.barcodes.quantity} ${document.uom}`;
    case "destination":
      return document.barcodes.destinationBin;
  }
}
