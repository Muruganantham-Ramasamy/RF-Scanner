import type { PickingStepId } from './pickingWorkflow';
import { DEMO_PICKING_DOCUMENT } from './pickingDataSource';

export type UiTerm = {
  label: string;
  shortLabel: string;
  meaning: string;
  scanTitle: string;
  scanHelper: string;
  mismatchTitle: string;
  mismatchHint: string;
};

export const PICKING_UI_TERMS: Record<PickingStepId, UiTerm> = {
  wo: {
    label: 'Warehouse Order (WO)',
    shortLabel: 'WO',
    meaning: 'This identifies the picking job to be processed.',
    scanTitle: 'Scan Warehouse Order (WO)',
    scanHelper: 'Scan the barcode on the warehouse picking order.',
    mismatchTitle: 'Incorrect Warehouse Order',
    mismatchHint: 'Please scan the correct warehouse order.',
  },
  source: {
    label: 'Source Bin (SBin)',
    shortLabel: 'SBin',
    meaning: 'This confirms where the product should be picked from.',
    scanTitle: 'Scan Source Bin (SBin)',
    scanHelper: 'Scan the barcode of the bin where the product is currently stored.',
    mismatchTitle: 'Incorrect Source Bin',
    mismatchHint: 'Please scan the correct source bin.',
  },
  product: {
    label: 'Product (Prod.)',
    shortLabel: 'Prod.',
    meaning: 'This confirms that you are picking the correct product.',
    scanTitle: 'Scan Product (Prod.)',
    scanHelper: 'Scan the barcode on the product you need to pick.',
    mismatchTitle: 'Incorrect Product',
    mismatchHint: 'Please scan the correct product.',
  },
  batch: {
    label: 'Batch',
    shortLabel: 'Batch',
    meaning: 'This confirms that the product belongs to the required batch.',
    scanTitle: 'Scan Batch',
    scanHelper: 'Scan the barcode on the product batch.',
    mismatchTitle: 'Incorrect Batch',
    mismatchHint: 'Please scan the correct batch.',
  },
  quantity: {
    label: 'Quantity (AQty)',
    shortLabel: 'AQty',
    meaning: 'Confirm that the picked quantity matches the required quantity.',
    scanTitle: 'Confirm Quantity (AQty)',
    scanHelper: 'Enter the quantity you are picking.',
    mismatchTitle: 'Incorrect Quantity',
    mismatchHint: 'Please enter the correct quantity.',
  },
  destination: {
    label: 'Destination Bin (DstBin)',
    shortLabel: 'DstBin',
    meaning: 'This confirms the destination location for the picked product.',
    scanTitle: 'Scan Destination Bin (DstBin)',
    scanHelper: 'Scan the barcode of the bin where the product will be placed.',
    mismatchTitle: 'Incorrect Destination Bin',
    mismatchHint: 'Please scan the correct destination bin.',
  },
};

export const UOM_UI = {
  label: 'UOM',
  meaning: 'Unit used to measure the quantity',
  value: DEMO_PICKING_DOCUMENT.uom,
} as const;

export const PICKING_COMPLETE_UI = {
  title: 'Picking Complete',
  description: 'All required checks have been completed successfully.',
  disclaimer: 'This is a demonstration workflow. No SAP posting has been performed.',
  printLabel: 'Print',
} as const;

export const VERIFICATION_SUMMARY_UI = {
  title: 'Verification Summary',
  description: 'All required checks were completed successfully.',
  continueLabel: 'Continue to Complete',
} as const;

export const RF_DOCUMENT_FIELDS = DEMO_PICKING_DOCUMENT.rfFields;

export function verifiedSuccessLabel(stepId: PickingStepId): string {
  switch (stepId) {
    case 'wo':
      return '✓ Warehouse Order Verified';
    case 'source':
      return '✓ Source Bin Verified';
    case 'product':
      return '✓ Product Verified';
    case 'batch':
      return '✓ Batch Verified';
    case 'quantity':
      return '✓ Quantity Confirmed';
    case 'destination':
      return '✓ Destination Bin Verified';
  }
}

export function movingToNextLabel(completedStepId: PickingStepId): string {
  const order = ['wo', 'source', 'product', 'batch', 'quantity', 'destination'] as const;
  const idx = order.indexOf(completedStepId);
  if (idx < 0 || idx >= order.length - 1) {
    return 'Moving to Verification Summary...';
  }
  const next = order[idx + 1];
  switch (next) {
    case 'source':
      return 'Moving to Source Bin...';
    case 'product':
      return 'Moving to Product...';
    case 'batch':
      return 'Moving to Batch...';
    case 'quantity':
      return 'Moving to Quantity...';
    case 'destination':
      return 'Moving to Destination Bin...';
    default:
      return 'Moving to next step...';
  }
}
