/**
 * Ported from the Vite frontend safeBarcodeScanner.
 * Capture/gate only — no domain validation.
 */

export type SafeScanResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'invalid_type' };

export type ScanResult =
  | { type: 'ScanSuccess'; value: string }
  | { type: 'ScanCancelled' }
  | { type: 'ScanFailure'; message: string }
  | { type: 'ScanDuplicate' }
  | { type: 'ScanBusy' };

export function safeCaptureBarcode(input: unknown): SafeScanResult {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'invalid_type' };
  }
  const value = input.trim();
  if (!value) {
    return { ok: false, reason: 'empty' };
  }
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '');
  if (!cleaned) {
    return { ok: false, reason: 'empty' };
  }
  return { ok: true, value: cleaned };
}

export function safeBarcodeScanner(raw: unknown): SafeScanResult {
  try {
    return safeCaptureBarcode(raw);
  } catch {
    return { ok: false, reason: 'invalid_type' };
  }
}

export function createSafeScanSession(options: { duplicateWindowMs?: number } = {}) {
  const duplicateWindowMs = options.duplicateWindowMs ?? 1500;
  let inFlight = false;
  let lastValue: string | null = null;
  let lastAt = 0;

  function submit(raw: unknown): ScanResult {
    if (inFlight) {
      return { type: 'ScanBusy' };
    }

    const captured = safeBarcodeScanner(raw);
    if (!captured.ok) {
      return {
        type: 'ScanFailure',
        message: captured.reason === 'empty' ? 'empty' : 'invalid_type',
      };
    }

    const now = Date.now();
    if (
      lastValue !== null &&
      lastValue === captured.value &&
      now - lastAt < duplicateWindowMs
    ) {
      return { type: 'ScanDuplicate' };
    }

    inFlight = true;
    lastValue = captured.value;
    lastAt = now;
    return { type: 'ScanSuccess', value: captured.value };
  }

  function release() {
    inFlight = false;
  }

  function resetDuplicateMemory() {
    lastValue = null;
    lastAt = 0;
  }

  return { submit, release, resetDuplicateMemory };
}
