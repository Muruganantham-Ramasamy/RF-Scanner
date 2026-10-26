/**
 * Ported from the Vite frontend warehouseOrderEntry controller.
 */

import { DEMO_PICKING_DOCUMENT } from './pickingDataSource';
import { barcodesMatch } from './pickingWorkflow';
import { safeBarcodeScanner } from '@/services/scanner/safeBarcodeScanner';

export type WarehouseOrderValidation =
  | { ok: true; value: string }
  | {
      ok: false;
      reason: 'blank' | 'not_found';
      message: string;
      value?: string;
    };

export function validateWarehouseOrder(
  raw: unknown,
  expectedWo: string = DEMO_PICKING_DOCUMENT.wo,
): WarehouseOrderValidation {
  const captured = safeBarcodeScanner(raw);
  if (!captured.ok) {
    return {
      ok: false,
      reason: 'blank',
      message: 'Warehouse Order is required.',
    };
  }

  if (!barcodesMatch(captured.value, expectedWo)) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Warehouse Order not found.',
      value: captured.value,
    };
  }

  return { ok: true, value: captured.value };
}

export const WarehouseOrderEntryController = {
  expectedWo: DEMO_PICKING_DOCUMENT.wo,
  emptyManualValue(): string {
    return '';
  },
  validate(raw: unknown): WarehouseOrderValidation {
    return validateWarehouseOrder(raw, DEMO_PICKING_DOCUMENT.wo);
  },
  shouldAutoStartCamera(options: { verified?: boolean; showManual?: boolean }): boolean {
    if (options.verified || options.showManual) return false;
    return true;
  },
};
