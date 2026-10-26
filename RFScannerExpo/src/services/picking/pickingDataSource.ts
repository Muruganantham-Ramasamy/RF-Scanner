/**
 * Ported from the Vite frontend pickingDataSource.
 * Demo document powers validation until SAP supplies live RF documents.
 */

export type VerificationStepId =
  | 'wo'
  | 'source'
  | 'product'
  | 'batch'
  | 'quantity'
  | 'destination';

export type RfDocumentField = {
  id: string;
  label: string;
  meaning: string;
  value: string;
};

export type PickingDocument = {
  wo: string;
  sourceBin: string;
  product: string;
  batch: string;
  quantity: string;
  uom: string;
  destinationBin: string;
  barcodes: {
    wo: string;
    sourceBin: string;
    product: string;
    batch: string;
    quantity: string;
    destinationBin: string;
  };
  rfFields: readonly RfDocumentField[];
  requiredVerificationSteps: readonly VerificationStepId[];
};

const DEMO_RF_FIELDS: readonly RfDocumentField[] = [
  { id: 'pickHu', label: 'Pick-HU', meaning: 'Handling unit used for picking', value: 'Not assigned' },
  { id: 'srcHu', label: 'SrcHU', meaning: 'Handling unit at the source', value: 'Not assigned' },
  { id: 'destHu', label: 'DestHU', meaning: 'Handling unit at the destination', value: 'Not assigned' },
  { id: 'packMat', label: 'Pack Mat', meaning: 'Packaging material', value: 'Not assigned' },
  { id: 'lp', label: 'LP', meaning: 'License plate / handling-unit identifier', value: 'Not assigned' },
  { id: 'plnHus', label: 'PlnHUs', meaning: 'Planned handling units', value: 'Not assigned' },
  { id: 'actHus', label: 'ActHUs', meaning: 'Actual handling units', value: 'Not assigned' },
  { id: 'huWh', label: 'HUWh', meaning: 'Handling unit warehouse information', value: 'Not assigned' },
  { id: 'logPos', label: 'LogPos', meaning: 'Item position', value: 'Not assigned' },
];

export const DEMO_REQUIRED_VERIFICATION_STEPS: readonly VerificationStepId[] = [
  'wo',
  'source',
  'product',
  'batch',
  'quantity',
  'destination',
] as const;

export const DEMO_PICKING_DOCUMENT: PickingDocument = {
  wo: '200028',
  sourceBin: '0010-20-27',
  product: '1000001106',
  batch: 'BATCH1',
  quantity: '2',
  uom: 'EA',
  destinationBin: '9020 0001 GI-ZONE',
  barcodes: {
    wo: '200028',
    sourceBin: '0010-20-27',
    product: '1000001106',
    batch: 'BATCH1',
    quantity: '2',
    destinationBin: '9020 0001 GI-ZONE',
  },
  rfFields: DEMO_RF_FIELDS,
  requiredVerificationSteps: DEMO_REQUIRED_VERIFICATION_STEPS,
};

export type PickingMethodId =
  | 'system-guided'
  | 'queue'
  | 'by-wr'
  | 'by-wo'
  | 'by-hu';

export type PickingMethodMeta = {
  id: PickingMethodId;
  label: string;
  sub: string;
  flowTitle: string;
};

export const PICKING_METHODS: readonly PickingMethodMeta[] = [
  { id: 'system-guided', label: 'Picking System Guided', sub: '', flowTitle: 'Picking System Guided' },
  { id: 'queue', label: 'System Guided by Queue', sub: '', flowTitle: 'System Guided by Queue' },
  { id: 'by-wr', label: 'Picking by WR', sub: 'WAREHOUSE REQUEST', flowTitle: 'Picking by WR' },
  { id: 'by-wo', label: 'Picking by WO', sub: 'WAREHOUSE ORDER', flowTitle: 'Picking by WO' },
  { id: 'by-hu', label: 'Picking by HU', sub: 'HANDLING UNIT', flowTitle: 'Picking by HU' },
] as const;

export function getPickingMethodMeta(method: PickingMethodId): PickingMethodMeta {
  return PICKING_METHODS.find((m) => m.id === method) ?? PICKING_METHODS.find((m) => m.id === 'by-wo')!;
}

/**
 * Active picking document for the session.
 * All Outbound methods share one reusable document shape today (original behavior).
 */
export function getActivePickingDocument(_method: PickingMethodId = 'by-wo'): PickingDocument {
  return DEMO_PICKING_DOCUMENT;
}

export function expectedBarcodeForStep(
  stepId: VerificationStepId,
  document: PickingDocument = DEMO_PICKING_DOCUMENT,
): string {
  switch (stepId) {
    case 'wo':
      return document.barcodes.wo;
    case 'source':
      return document.barcodes.sourceBin;
    case 'product':
      return document.barcodes.product;
    case 'batch':
      return document.barcodes.batch;
    case 'quantity':
      return `${document.barcodes.quantity} ${document.uom}`;
    case 'destination':
      return document.barcodes.destinationBin;
  }
}

export type PickingDetailRow = {
  key: string;
  label: string;
  value: string;
  stepId?: VerificationStepId;
};

export function getConsolidatedPickingDetailRows(
  document: PickingDocument = DEMO_PICKING_DOCUMENT,
): PickingDetailRow[] {
  return [
    { key: 'wo', label: 'Warehouse Order (WO)', value: document.wo, stepId: 'wo' },
    { key: 'source', label: 'Source Bin (SBin)', value: document.sourceBin, stepId: 'source' },
    { key: 'product', label: 'Product (Prod.)', value: document.product, stepId: 'product' },
    { key: 'batch', label: 'Batch', value: document.batch, stepId: 'batch' },
    {
      key: 'quantity',
      label: 'Quantity (AQty)',
      value: `${document.quantity} ${document.uom}`,
      stepId: 'quantity',
    },
    { key: 'uom', label: 'UOM', value: document.uom },
    {
      key: 'destination',
      label: 'Destination Bin (DstBin)',
      value: document.destinationBin,
      stepId: 'destination',
    },
    ...document.rfFields.map((f) => ({ key: f.id, label: f.label, value: f.value })),
  ];
}
