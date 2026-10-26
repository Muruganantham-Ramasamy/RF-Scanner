import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  IconCamera,
  IconKeypad,
  IconQR,
  IconWarning,
} from '@/components/icons/AppIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import { createSafeScanSession } from '@/services/scanner/safeBarcodeScanner';

/**
 * Formats aligned with the original ZXing / BarcodeDetector set
 * (qr, code128/39/93, ean, upc, itf, codabar). data_matrix is not in expo-camera BarcodeType.
 */
export const WAREHOUSE_BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'code128',
  'code39',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code93',
  'codabar',
  'itf14',
];

/**
 * Return:
 * - true / void → accept (pause until remount / resetKey)
 * - false → mismatch; keep camera open for another try
 * - "ignore" → duplicate/busy; keep open quietly
 */
export type ScanDisposition = boolean | void | 'ignore';

type BarcodeScannerProps = {
  title?: string;
  helper?: string;
  expectedHint?: string;
  enabled?: boolean;
  allowManual?: boolean;
  /** Remount / unlock key when parent advances to a new step. */
  resetKey?: string;
  /** Prefer true on workflow screens so CameraView is not nested in ScrollView. */
  fill?: boolean;
  onScanned: (value: string) => ScanDisposition;
};

export function BarcodeScanner({
  title = 'Scan barcode',
  helper = 'Point the camera at the barcode.',
  expectedHint,
  enabled = true,
  allowManual = true,
  resetKey,
  fill = false,
  onScanned,
}: BarcodeScannerProps) {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mismatchFlash, setMismatchFlash] = useState(false);
  const [accepting, setAccepting] = useState(true);
  const sessionRef = useRef(createSafeScanSession());
  const onScannedRef = useRef(onScanned);
  const capturedRef = useRef(false);
  onScannedRef.current = onScanned;

  const cameraActive =
    isFocused && enabled && accepting && !showManual && !cameraError && !capturedRef.current;

  useEffect(() => {
    sessionRef.current = createSafeScanSession();
    capturedRef.current = false;
    setAccepting(true);
    setLastValue(null);
    setCameraError(null);
    setMismatchFlash(false);
    setShowManual(false);
    setManual('');
  }, [title, expectedHint, enabled, resetKey]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  function applyDisposition(value: string, disposition: ScanDisposition) {
    if (disposition === 'ignore') {
      capturedRef.current = false;
      sessionRef.current.release();
      setAccepting(true);
      return;
    }
    if (disposition === false) {
      capturedRef.current = false;
      sessionRef.current.release();
      setAccepting(true);
      setLastValue(null);
      setMismatchFlash(true);
      setTimeout(() => setMismatchFlash(false), 1400);
      return;
    }
    // success / void — pause until parent changes resetKey / title
    sessionRef.current.release();
    sessionRef.current.resetDuplicateMemory();
    setLastValue(value);
    setAccepting(false);
  }

  function handleBarcode(data: string) {
    if (!isFocused || !enabled || !accepting || showManual || cameraError) return;
    if (capturedRef.current) return;

    const gated = sessionRef.current.submit(data);
    if (gated.type === 'ScanBusy' || gated.type === 'ScanDuplicate') {
      return;
    }
    if (gated.type !== 'ScanSuccess') {
      sessionRef.current.release();
      return;
    }

    capturedRef.current = true;
    const disposition = onScannedRef.current(gated.value);
    applyDisposition(gated.value, disposition);
  }

  function unlockForRescan() {
    sessionRef.current.release();
    sessionRef.current.resetDuplicateMemory();
    capturedRef.current = false;
    setAccepting(true);
    setLastValue(null);
    setCameraError(null);
    setMismatchFlash(false);
  }

  function submitManual() {
    const gated = sessionRef.current.submit(manual);
    if (gated.type === 'ScanBusy' || gated.type === 'ScanDuplicate') {
      return;
    }
    if (gated.type !== 'ScanSuccess') {
      sessionRef.current.release();
      return;
    }
    capturedRef.current = true;
    const disposition = onScannedRef.current(gated.value);
    setManual('');
    applyDisposition(gated.value, disposition);
  }

  if (!permission) {
    return (
      <Card>
        <View style={styles.titleRow}>
          <IconCamera size={22} color={WarehouseColors.textMuted} />
          <Text style={styles.status}>Checking camera permission…</Text>
        </View>
      </Card>
    );
  }

  if (!permission.granted) {
    return (
      <Card>
        <View style={styles.titleRow}>
          <IconCamera size={22} />
          <Text style={styles.title}>Camera permission required</Text>
        </View>
        <Text style={styles.helper}>
          Allow camera access so RF Scanner can read warehouse barcodes on this device.
        </Text>
        <Button label="Allow Camera" onPress={() => void requestPermission()} />
        {allowManual ? (
          <>
            <Button
              label="Enter Manually Instead"
              variant="secondary"
              onPress={() => setShowManual(true)}
            />
            {showManual ? (
              <View style={styles.manualBlock}>
                <TextInput
                  value={manual}
                  onChangeText={setManual}
                  placeholder="Enter barcode"
                  placeholderTextColor={WarehouseColors.textMuted}
                  autoCapitalize="characters"
                  style={styles.input}
                />
                <Button label="Submit" onPress={submitManual} />
              </View>
            ) : null}
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <View style={[styles.wrap, fill && styles.wrapFill]}>
      {!fill ? (
        <Card>
          <View style={styles.titleRow}>
            <IconQR size={28} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.helper}>{helper}</Text>
          {expectedHint ? (
            <View style={styles.expected}>
              <Text style={styles.expectedLabel}>EXPECTED</Text>
              <Text style={styles.expectedValue}>{expectedHint}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {!showManual ? (
        <View style={[styles.cameraShell, fill && styles.cameraShellFill, mismatchFlash && styles.cameraMismatch]}>
          {isFocused ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              active={cameraActive}
              barcodeScannerSettings={{ barcodeTypes: WAREHOUSE_BARCODE_TYPES }}
              onBarcodeScanned={
                cameraActive ? (result) => handleBarcode(result.data) : undefined
              }
              onMountError={(event) => {
                setCameraError(event.message || 'Camera failed to start.');
                setAccepting(false);
              }}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cameraOff]}>
              <Text style={styles.overlayText}>Camera paused</Text>
            </View>
          )}
          <View style={styles.guide} pointerEvents="none" />
          <View style={styles.overlayBottom}>
            <View style={styles.overlayRow}>
              {mismatchFlash ? (
                <IconWarning size={14} color="#FFFFFF" />
              ) : (
                <IconCamera size={14} color="#FFFFFF" />
              )}
              <Text style={styles.overlayText}>
                {!isFocused
                  ? 'Camera paused while this screen is in the background'
                  : mismatchFlash
                    ? 'Incorrect barcode — try again'
                    : lastValue && !accepting
                      ? `Captured: ${lastValue}`
                      : cameraActive
                        ? 'Camera active — point at the barcode'
                        : 'Scanner idle'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {fill && expectedHint && !showManual ? (
        <Text style={styles.fillExpected}>Expected: {expectedHint}</Text>
      ) : null}

      {cameraError ? (
        <Card style={styles.errorCard}>
          <View style={styles.titleRow}>
            <IconWarning size={18} color={WarehouseColors.danger} />
            <Text style={styles.errorTitle}>Camera error</Text>
          </View>
          <Text style={styles.helper}>{cameraError}</Text>
          <Button label="Try Again" onPress={unlockForRescan} />
          {allowManual ? (
            <Button
              label="Enter Manually"
              variant="secondary"
              onPress={() => {
                setShowManual(true);
                setAccepting(false);
              }}
            />
          ) : null}
        </Card>
      ) : null}

      {allowManual ? (
        <View style={styles.manualFooter}>
          {showManual ? (
            <View style={styles.manualBlock}>
              <View style={styles.titleRow}>
                <IconKeypad size={20} />
                <Text style={styles.manualTitle}>Manual barcode entry</Text>
              </View>
              <TextInput
                value={manual}
                onChangeText={setManual}
                placeholder="Enter barcode manually"
                placeholderTextColor={WarehouseColors.textMuted}
                autoCapitalize="characters"
                style={styles.input}
              />
              <Button label="Submit Manual Entry" onPress={submitManual} />
              <Button
                label="Back to Camera"
                variant="ghost"
                onPress={() => {
                  setShowManual(false);
                  unlockForRescan();
                }}
              />
            </View>
          ) : (
            <Button
              label="Enter Manually"
              variant="secondary"
              onPress={() => {
                setShowManual(true);
                setAccepting(false);
              }}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: WarehouseSpacing.md,
  },
  wrapFill: {
    flex: 1,
    minHeight: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  manualTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    color: WarehouseColors.textSecondary,
  },
  status: {
    color: WarehouseColors.textSecondary,
    fontWeight: '600',
  },
  expected: {
    marginTop: WarehouseSpacing.sm,
    backgroundColor: WarehouseColors.background,
    borderRadius: WarehouseRadius.sm,
    padding: WarehouseSpacing.md,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
  },
  expectedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WarehouseColors.textMuted,
  },
  expectedValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: WarehouseColors.text,
    fontVariant: ['tabular-nums'],
  },
  fillExpected: {
    fontSize: 12,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
    textAlign: 'center',
  },
  cameraShell: {
    height: 300,
    borderRadius: WarehouseRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    borderWidth: 2,
    borderColor: WarehouseColors.accent,
  },
  cameraShellFill: {
    flex: 1,
    height: undefined,
    minHeight: 220,
  },
  cameraMismatch: {
    borderColor: WarehouseColors.warning,
  },
  cameraOff: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1220',
  },
  guide: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '28%',
    bottom: '28%',
    borderWidth: 2,
    borderColor: WarehouseColors.accent,
    borderRadius: WarehouseRadius.sm,
  },
  overlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: WarehouseSpacing.md,
    backgroundColor: 'rgba(26,26,34,0.72)',
  },
  overlayText: {
    color: WarehouseColors.white,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  manualFooter: {
    gap: WarehouseSpacing.sm,
  },
  manualBlock: {
    gap: WarehouseSpacing.md,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    borderRadius: WarehouseRadius.md,
    paddingHorizontal: WarehouseSpacing.md,
    color: WarehouseColors.text,
    backgroundColor: WarehouseColors.white,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: WarehouseColors.dangerSoft,
  },
  errorTitle: {
    fontWeight: '800',
    color: WarehouseColors.danger,
  },
});
