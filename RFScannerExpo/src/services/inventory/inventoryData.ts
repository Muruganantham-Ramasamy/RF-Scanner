/**
 * Inventory data boundary.
 *
 * No inventory API exists in the current repository backend (placeholder only).
 * This module exposes clearly labeled demo stock for the Expo UI until
 * a real endpoint is available.
 */

import { apiGet } from '@/services/api/client';
import { API_CONFIG } from '@/services/api/config';

export type InventoryItem = {
  id: string;
  product: string;
  productName: string;
  barcode: string;
  location: string;
  batch: string;
  quantity: number;
  uom: string;
};

/** Explicitly demo — not live warehouse stock. */
export const DEMO_INVENTORY: readonly InventoryItem[] = [
  {
    id: '1',
    product: '1000001106',
    productName: 'Widget Assembly A',
    barcode: '1000001106',
    location: '0010-20-27',
    batch: 'BATCH1',
    quantity: 48,
    uom: 'EA',
  },
  {
    id: '2',
    product: '1000002201',
    productName: 'Bracket Kit B',
    barcode: '1000002201',
    location: '0010-21-05',
    batch: 'BATCH7',
    quantity: 120,
    uom: 'EA',
  },
  {
    id: '3',
    product: '1000003308',
    productName: 'Seal Pack C',
    barcode: '1000003308',
    location: '0020-10-12',
    batch: 'LOT-09',
    quantity: 15,
    uom: 'EA',
  },
] as const;

export type InventoryLoadResult = {
  items: InventoryItem[];
  source: 'demo' | 'api';
  warning?: string;
};

/**
 * Attempts `/inventory` when API_BASE is configured.
 * Falls back to demo data with a clear warning — never invents a fake success
 * against a missing backend.
 */
export async function loadInventory(): Promise<InventoryLoadResult> {
  if (!API_CONFIG.isConfigured) {
    return {
      items: [...DEMO_INVENTORY],
      source: 'demo',
      warning:
        'Showing demo inventory. Configure EXPO_PUBLIC_API_BASE_URL and implement GET /inventory for live stock.',
    };
  }

  const result = await apiGet<InventoryItem[]>('/inventory');
  if (!result.ok) {
    return {
      items: [...DEMO_INVENTORY],
      source: 'demo',
      warning: `Live inventory unavailable (${result.error}). Showing demo data.`,
    };
  }

  return { items: result.data, source: 'api' };
}

export function filterInventory(
  items: readonly InventoryItem[],
  query: string,
): InventoryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter(
    (item) =>
      item.product.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.batch.toLowerCase().includes(q),
  );
}
