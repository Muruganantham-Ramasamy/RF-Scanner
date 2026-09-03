/**
 * Safe barcode acquisition helpers.
 * These only obtain/protect a raw scan string — they do NOT validate
 * against expected WO / bin / product values (that stays in PickingWorkflowService).
 */

export type SafeScanResult =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "invalid_type" };

/** Scanner outcome for UI/workflow adapters (raw capture only). */
export type ScanResult =
  | { type: "ScanSuccess"; value: string }
  | { type: "ScanCancelled" }
  | { type: "ScanFailure"; message: string }
  | { type: "ScanDuplicate" }
  | { type: "ScanBusy" };

/** Normalize a scanner/manual payload into a safe raw barcode string. */
export function safeCaptureBarcode(input: unknown): SafeScanResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "invalid_type" };
  }
  const value = input.trim();
  if (!value) {
    return { ok: false, reason: "empty" };
  }
  // Strip control characters; keep printable content for validation upstream.
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "");
  if (!cleaned) {
    return { ok: false, reason: "empty" };
  }
  return { ok: true, value: cleaned };
}

/** Camera-style capture: returns raw value only when present. */
export function cameraBarcodeScanner(raw: unknown): SafeScanResult {
  return safeCaptureBarcode(raw);
}

/** Manual entry capture: same safe path as camera. */
export function manualBarcodeScanner(raw: unknown): SafeScanResult {
  return safeCaptureBarcode(raw);
}

/**
 * SafeBarcodeScanner: wraps camera/manual capture and never throws.
 * Always returns a discriminated result for the UI layer.
 */
export function safeBarcodeScanner(raw: unknown): SafeScanResult {
  try {
    return safeCaptureBarcode(raw);
  } catch {
    return { ok: false, reason: "invalid_type" };
  }
}

export type SafeScanSessionOptions = {
  /** Ignore identical barcodes within this window (ms). Default 1500. */
  duplicateWindowMs?: number;
};

/**
 * Session gate for continuous camera scanning.
 * Prevents duplicate bursts and concurrent workflow submissions.
 * Does NOT perform domain validation.
 */
export function createSafeScanSession(options: SafeScanSessionOptions = {}) {
  const duplicateWindowMs = options.duplicateWindowMs ?? 1500;
  let inFlight = false;
  let lastValue: string | null = null;
  let lastAt = 0;

  function submit(raw: unknown): ScanResult {
    if (inFlight) {
      return { type: "ScanBusy" };
    }

    const captured = safeBarcodeScanner(raw);
    if (!captured.ok) {
      return {
        type: "ScanFailure",
        message: captured.reason === "empty" ? "empty" : "invalid_type",
      };
    }

    const now = Date.now();
    if (
      lastValue !== null &&
      lastValue === captured.value &&
      now - lastAt < duplicateWindowMs
    ) {
      return { type: "ScanDuplicate" };
    }

    inFlight = true;
    lastValue = captured.value;
    lastAt = now;
    return { type: "ScanSuccess", value: captured.value };
  }

  function release() {
    inFlight = false;
  }

  function cancel(): ScanResult {
    inFlight = false;
    return { type: "ScanCancelled" };
  }

  function resetDuplicateMemory() {
    lastValue = null;
    lastAt = 0;
  }

  function isBusy() {
    return inFlight;
  }

  return {
    submit,
    release,
    cancel,
    resetDuplicateMemory,
    isBusy,
  };
}

export type SafeScanSession = ReturnType<typeof createSafeScanSession>;
