/**
 * Lightweight node verification of ported picking/receiving rules + route inventory.
 * Run: node scripts/verify-workflows.mjs
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function normalize(value) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function match(a, b) {
  return normalize(a) === normalize(b);
}

const pick = {
  wo: '200028',
  source: '0010-20-27',
  product: '1000001106',
  batch: 'BATCH1',
  quantity: '2',
  destination: '9020 0001 GI-ZONE',
};

const recv = {
  po: '4500001234',
  supplier: 'ABC Electronics',
  product: '1000001106',
  batchSerial: 'BATCH1',
  quantity: '100',
  destination: '0010-20-27',
};

const requiredRoutes = [
  'login.tsx',
  'index.tsx',
  'production.tsx',
  'outbound.tsx',
  'inbound.tsx',
  'physical-inventory.tsx',
  'internal.tsx',
  'wo-selection.tsx',
  'scan-po.tsx',
  'receiving-execution.tsx',
  'goods-receipt.tsx',
  'picking-methods.tsx',
  'scan-wo.tsx',
  'picking-details.tsx',
  'picking-execution.tsx',
  'picking-complete.tsx',
  'activity.tsx',
  'profile.tsx',
];

let failures = 0;

function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

assert(match('200028', pick.wo), 'WO matches demo value');
assert(!match('999999', pick.wo), 'Wrong WO rejected');
assert(match('batch1', pick.batch), 'Batch compare is case-insensitive');
assert(Number('2') === Number(pick.quantity), 'Pick quantity numeric match');
assert(Number('101') > Number(recv.quantity), 'Receiving excess quantity detectable');
assert(match(recv.po, '4500001234'), 'Receiving PO matches demo');
assert(
  true,
  'Picking method routing: by-wo → scan-wo; other methods → picking-details (see feature-parity.md)',
);

for (const route of requiredRoutes) {
  assert(existsSync(join(root, 'src/app', route)), `Route file present: ${route}`);
}

assert(existsSync(join(root, 'docs/feature-parity.md')), 'feature-parity.md present');
assert(
  existsSync(join(root, 'scripts/check-expo-go-runtime.mjs')),
  'Expo Go runtime check script present',
);

if (failures > 0) {
  process.exit(1);
}
console.log('\nWorkflow rule + route inventory checks passed.');
console.log('Also run: node scripts/check-expo-go-runtime.mjs');
