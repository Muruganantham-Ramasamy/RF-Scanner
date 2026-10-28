import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
 * Warehouse barcode formats needed by picking / receiving demo documents.
 * data_matrix is not in expo-camera BarcodeType on SDK 58.
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

type Availability = 'checking' | 'available' | 'unavailable';

/**
 * Shared warehouse barcode scanner.
 * Uses expo-camera CameraView on Android, iOS, and web (getUserMedia + BarcodeDetector).
 * Falls back to manual entry only when the camera is unavailable or fails to start —
 * never fakes a successful scan.
 */
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
  const [availability, setAvailability] = useState<Availability>('checking');
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mismatchFlash, setMismatchFlash] = useState(false);
  const [accepting, setAccepting] = useState(true);
  const [cameraEpoch, setCameraEpoch] = useState(0);
  const sessionRef = useRef(createSafeScanSession());
  const onScannedRef = useRef(onScanned);
  const capturedRef = useRef(false);
  const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  onScannedRef.current = onScanned;

  const permissionGranted = Boolean(permission?.granted);
  const cameraActive =
    availability === 'available' &&
    permissionGranted &&
    isFocused &&
    enabled &&
    accepting &&
    !showManual &&
    !cameraError;

  /**
   * CameraView.isAvailableAsync() is a web-only probe (docs: @platform web).
   * On Android/iOS (including Expo Go) it can resolve false / reject even when
   * a real camera exists — which previously showed "Camera unavailable".
   * Native runtimes assume a camera and rely on permissions + onMountError.
   */
  useEffect(() => {
    let cancelled = false;

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      setAvailability('available');
      return;
    }

    setAvailability('checking');
    void CameraView.isAvailableAsync()
      .then((ok) => {
        if (!cancelled) setAvailability(ok ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setAvailability('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    sessionRef.current = createSafeScanSession();
    capturedRef.current = false;
    setAccepting(true);
    setLastValue(null);
    setCameraError(null);
    setMismatchFlash(false);
    setShowManual(false);
    setManual('');
    setCameraEpoch((n) => n + 1);
  }, [title, expectedHint, enabled, resetKey]);

  useEffect(() => {
    if (availability !== 'available') return;
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [availability, permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
      sessionRef.current.release();
      capturedRef.current = false;
    };
  }, []);

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
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = setTimeout(() => setMismatchFlash(false), 1400);
      return;
    }
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
    setCameraEpoch((n) => n + 1);
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

  function renderManualBlock() {
    return (
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
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submitManual}
          style={styles.input}
        />
        <Button label="Submit Manual Entry" onPress={submitManual} />
      </View>
    );
  }

  if (availability === 'checking' || !permission) {
    return (
      <Card>
        <View style={styles.titleRow}>
          <ActivityIndicator color={WarehouseColors.accent} />
          <Text style={styles.status}>
            {availability === 'checking' ? 'Checking camera…' : 'Checking camera permission…'}
          </Text>
        </View>
      </Card>
    );
  }

  if (availability === 'unavailable') {
    return (
      <Card style={styles.warnCard}>
        <View style={styles.titleRow}>
          <IconWarning size={22} color={WarehouseColors.warning} />
          <Text style={styles.title}>Camera unavailable</Text>
        </View>
        <Text style={styles.helper}>
          No camera was detected on this runtime. Manual entry remains available for workflow
          testing. On Android, open the app in Expo Go or a device build to use live scanning.
        </Text>
        {expectedHint ? (
          <View style={styles.expected}>
            <Text style={styles.expectedLabel}>EXPECTED</Text>
            <Text style={styles.expectedValue}>{expectedHint}</Text>
          </View>
        ) : null}
        {allowManual ? renderManualBlock() : null}
      </Card>
    );
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;
    return (
      <Card>
        <View style={styles.titleRow}>
          <IconCamera size={22} />
          <Text style={styles.title}>Camera permission required</Text>
        </View>
        <Text style={styles.helper}>
          {canAskAgain
            ? Platform.OS === 'web'
              ? 'Allow camera access in the browser so RF Scanner can read warehouse barcodes.'
              : 'Allow camera access so RF Scanner can read warehouse barcodes on this device.'
            : 'Camera access is blocked. Enable the camera permission in system or browser settings, or enter barcodes manually.'}
        </Text>
        {canAskAgain ? (
          <Button label="Allow Camera" onPress={() => void requestPermission()} />
        ) : Platform.OS !== 'web' ? (
          <Button label="Open App Settings" onPress={() => void Linking.openSettings()} />
        ) : null}
        {allowManual ? (
          <>
            <Button
              label="Enter Manually Instead"
              variant="secondary"
              onPress={() => setShowManual(true)}
            />
            {showManual ? renderManualBlock() : null}
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
        <View
          style={[
            styles.cameraShell,
            fill && styles.cameraShellFill,
            mismatchFlash && styles.cameraMismatch,
          ]}>
          <CameraView
            key={`camera-${cameraEpoch}-${resetKey ?? 'idle'}`}
            style={StyleSheet.absoluteFill}
            facing="back"
            active={cameraActive}
            barcodeScannerSettings={{ barcodeTypes: WAREHOUSE_BARCODE_TYPES }}
            onBarcodeScanned={
              cameraActive ? (result) => handleBarcode(result.data) : undefined
            }
            onCameraReady={() => {
              setCameraError(null);
            }}
            onMountError={(event) => {
              setCameraError(event.message || 'Camera failed to start.');
              setAccepting(false);
            }}
          />
          {!isFocused ? (
            <View style={[StyleSheet.absoluteFill, styles.cameraOff]} pointerEvents="none">
              <Text style={styles.overlayText}>Camera paused</Text>
            </View>
          ) : null}
          <View style={styles.guide} pointerEvents="none" />
          <View style={styles.overlayBottom}>
            <View style={styles.overlayRow}>
              {mismatchFlash ? (
                <IconWarning size={14} color="#FFFFFF" />
              ) : (
                <IconCamera size={14} color="#FFFFFF" />
              )}
              <Text style={styles.overlayText} numberOfLines={2}>
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
          <Button
            label="Try Again"
            onPress={() => {
              unlockForRescan();
              setShowManual(false);
            }}
          />
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
            <>
              {renderManualBlock()}
              <Button
                label="Back to Camera"
                variant="ghost"
                onPress={() => {
                  setShowManual(false);
                  unlockForRescan();
                }}
              />
            </>
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
  warnCard: {
    backgroundColor: WarehouseColors.warningSoft,
    borderColor: WarehouseColors.warningBorder,
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
    flex: 1,
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
    height: 280,
    borderRadius: WarehouseRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    borderWidth: 2,
    borderColor: WarehouseColors.accent,
  },
  cameraShellFill: {
    flex: 1,
    height: undefined,
    minHeight: 200,
  },
  cameraMismatch: {
    borderColor: WarehouseColors.warning,
  },
  cameraOff: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,18,32,0.72)',
  },
  guide: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '24%',
    bottom: '30%',
    borderWidth: 2,
    borderColor: WarehouseColors.accent,
    borderRadius: WarehouseRadius.sm,
  },
  overlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: WarehouseSpacing.md,
    paddingVertical: WarehouseSpacing.sm,
    backgroundColor: 'rgba(26,26,34,0.78)',
  },
  overlayText: {
    flex: 1,
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
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: WarehouseColors.dangerSoft,
  },
  errorTitle: {
    fontWeight: '800',
    color: WarehouseColors.danger,
  },
});
