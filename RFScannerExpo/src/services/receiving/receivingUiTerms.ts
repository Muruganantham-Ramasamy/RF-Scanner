import type { ReceivingStepId } from './receivingWorkflow';
import { DEMO_RECEIVING, EXPECTED_BY_RECEIVING_STEP } from './receivingWorkflow';

export type ReceivingUiTerm = {
  label: string;
  shortLabel: string;
  meaning: string;
  scanTitle: string;
  scanHelper: string;
  mismatchTitle: string;
};

export const RECEIVING_UI_TERMS: Record<ReceivingStepId, ReceivingUiTerm> = {
  po: {
    label: 'Purchase Order',
    shortLabel: 'PO',
    meaning: 'Order placed with the supplier',
    scanTitle: 'Scan Purchase Order',
    scanHelper: 'Point the camera at the purchase order barcode',
    mismatchTitle: 'Purchase Order does not match.',
  },
  supplier: {
    label: 'Supplier',
    shortLabel: 'Supp.',
    meaning: 'Supplier providing the material',
    scanTitle: 'Scan Supplier',
    scanHelper: 'Scan or enter the supplier for this Purchase Order',
    mismatchTitle: 'Supplier does not match.',
  },
  product: {
    label: 'Product',
    shortLabel: 'Prod.',
    meaning: 'Product being received',
    scanTitle: 'Scan Product',
    scanHelper: 'Scan the barcode of the product being received',
    mismatchTitle: 'Product does not match.',
  },
  batchSerial: {
    label: 'Batch / Serial',
    shortLabel: 'Batch',
    meaning: 'Product batch or serial number',
    scanTitle: 'Scan Batch / Serial',
    scanHelper: 'Scan the barcode for the product batch or serial number',
    mismatchTitle: 'Batch / Serial does not match.',
  },
  quantity: {
    label: 'Quantity',
    shortLabel: 'Qty',
    meaning: 'Amount received',
    scanTitle: 'Confirm Quantity',
    scanHelper: 'Confirm the amount received',
    mismatchTitle: 'Quantity does not match.',
  },
  destination: {
    label: 'Destination Bin',
    shortLabel: 'DstBin',
    meaning: 'Bin where the received product is stored',
    scanTitle: 'Scan Destination Bin',
    scanHelper: 'Scan the barcode of the bin where the received product is stored',
    mismatchTitle: 'Destination Bin does not match.',
  },
};

export function receivingDisplayValue(stepId: ReceivingStepId): string {
  if (stepId === 'quantity') {
    return `${DEMO_RECEIVING.quantity} ${DEMO_RECEIVING.uom}`;
  }
  return EXPECTED_BY_RECEIVING_STEP[stepId];
}
