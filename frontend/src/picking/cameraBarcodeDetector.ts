/**
 * Live camera barcode decoding.
 * Prefers native BarcodeDetector when available; falls back to ZXing.
 */

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { safeBarcodeScanner } from "./safeBarcodeScanner";

export type DetectedBarcode = {
  rawValue: string;
};

type NativeBarcodeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

type NativeBarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => NativeBarcodeDetector;

const NATIVE_FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "code_93",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "codabar",
  "data_matrix",
] as const;

function getNativeDetector(): NativeBarcodeDetector | null {
  const Ctor = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: [...NATIVE_FORMATS] });
  } catch {
    try {
      return new Ctor();
    } catch {
      return null;
    }
  }
}

function normalizeDetected(raw: string): string | null {
  const captured = safeBarcodeScanner(raw);
  return captured.ok ? captured.value : null;
}

/**
 * Continuously decode barcodes from a playing video element.
 * Calls onDetected once per unique value burst; caller should stop scanning after accept.
 */
export function startLiveBarcodeDetection(
  video: HTMLVideoElement,
  onDetected: (value: string) => void,
): () => void {
  let cancelled = false;
  let lastValue = "";
  let lastAt = 0;
  let rafId = 0;
  let zxingControls: IScannerControls | null = null;

  function emit(raw: string) {
    const value = normalizeDetected(raw);
    if (!value || cancelled) return;
    const now = Date.now();
    // Debounce identical reads from continuous scanning.
    if (value === lastValue && now - lastAt < 1500) return;
    lastValue = value;
    lastAt = now;
    onDetected(value);
  }

  const native = getNativeDetector();

  if (native) {
    const tick = async () => {
      if (cancelled) return;
      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const codes = await native.detect(video);
          if (!cancelled && codes.length > 0) {
            emit(codes[0].rawValue);
          }
        }
      } catch {
        // Frame may be unavailable briefly; keep scanning.
      }
      if (!cancelled) {
        rafId = window.setTimeout(() => {
          void tick();
        }, 250);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(rafId);
    };
  }

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.DATA_MATRIX,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 300,
    delayBetweenScanSuccess: 1200,
  });

  void reader
    .decodeFromVideoElement(video, (result) => {
      if (cancelled || !result) return;
      emit(result.getText());
    })
    .then((controls) => {
      zxingControls = controls;
      if (cancelled) controls.stop();
    })
    .catch(() => {
      // Video may not be ready yet; caller can restart after play.
    });

  return () => {
    cancelled = true;
    try {
      zxingControls?.stop();
    } catch {
      // ignore
    }
  };
}
