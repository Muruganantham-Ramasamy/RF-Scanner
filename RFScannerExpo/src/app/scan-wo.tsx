import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSuccess, IconWarning, StepFieldIcon } from '@/components/icons/AppIcons';
import { BarcodeScanner, type ScanDisposition } from '@/components/scanner/BarcodeScanner';
import { BottomNav } from '@/components/shell/BottomNav';
import { FlexBody, ScreenShell } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { StepProgress } from '@/components/warehouse/StepProgress';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import { usePickingSession } from '@/context/PickingSessionContext';
import { PICKING_UI_TERMS } from '@/services/picking/pickingUiTerms';
import { WarehouseOrderEntryController } from '@/services/picking/warehouseOrderEntry';

type VerifyStatus = 'waiting' | 'verified' | 'mismatch';

export default function ScanWOScreen() {
  const { flowTitle, markWoVerified } = usePickingSession();
  const [status, setStatus] = useState<VerifyStatus>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'verified' || !scannedValue) return;
    const timer = setTimeout(() => {
      markWoVerified(scannedValue);
      router.push('/picking-details' as Href);
    }, 900);
    return () => clearTimeout(timer);
  }, [status, scannedValue, markWoVerified]);

  /** Parent must not double-gate — BarcodeScanner already uses a safe session. */
  function onScan(raw: string): ScanDisposition {
    const result = WarehouseOrderEntryController.validate(raw);
    if (result.ok) {
      setScannedValue(result.value);
      setErrorMessage(null);
      setStatus('verified');
      return true;
    }
    setScannedValue(result.value ?? String(raw));
    setErrorMessage(result.message);
    setStatus('mismatch');
    return false;
  }

  const term = PICKING_UI_TERMS.wo;

  return (
    <ScreenShell>
      <TopBar title={flowTitle} subtitle="Scan warehouse picking order" showBack />
      <FlexBody>
        <StepProgress
          steps={[
            {
              id: 'wo',
              label: 'WO',
              status:
                status === 'verified' ? 'verified' : status === 'mismatch' ? 'failed' : 'current',
            },
            { id: 'source', label: 'SBin', status: 'waiting' },
            { id: 'product', label: 'Prod.', status: 'waiting' },
            { id: 'batch', label: 'Batch', status: 'waiting' },
            { id: 'quantity', label: 'AQty', status: 'waiting' },
            { id: 'destination', label: 'DstBin', status: 'waiting' },
          ]}
        />

        <View style={styles.guide}>
          <StepFieldIcon stepId="wo" size={36} active={status !== 'verified'} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.guideTitle}>{term.scanTitle}</Text>
            <Text style={styles.guideHelper}>{term.scanHelper}</Text>
          </View>
        </View>

        <View style={styles.expectedCard}>
          <Text style={styles.expectedLabel}>EXPECTED WO</Text>
          <Text style={styles.expectedValue}>{WarehouseOrderEntryController.expectedWo}</Text>
        </View>

        {status === 'verified' ? (
          <View style={styles.success}>
            <IconSuccess size={48} />
            <Text style={styles.successTitle}>Warehouse Order Verified</Text>
            <Text style={styles.successValue}>{scannedValue}</Text>
            <Text style={styles.successHint}>Continuing to Picking Details…</Text>
          </View>
        ) : (
          <BarcodeScanner
            title={term.scanTitle}
            helper={term.scanHelper}
            expectedHint={WarehouseOrderEntryController.expectedWo}
            resetKey="wo-gate"
            fill
            enabled
            onScanned={onScan}
          />
        )}

        {errorMessage && status === 'mismatch' ? (
          <View style={styles.mismatch}>
            <IconWarning size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mismatchTitle}>{term.mismatchTitle}</Text>
              <Text style={styles.mismatchHint}>{errorMessage}</Text>
              <Text style={styles.mismatchExpected}>
                Expected: {WarehouseOrderEntryController.expectedWo}
              </Text>
            </View>
          </View>
        ) : null}
      </FlexBody>
      <BottomNav active="scan" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideTitle: { fontSize: 15, fontWeight: '800', color: WarehouseColors.text },
  guideHelper: {
    fontSize: 12,
    fontWeight: '600',
    color: WarehouseColors.textSecondary,
    marginTop: 2,
  },
  expectedCard: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.md,
    borderWidth: 1.5,
    borderColor: WarehouseColors.border,
    paddingHorizontal: WarehouseSpacing.md,
    paddingVertical: 10,
    gap: 4,
  },
  expectedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WarehouseColors.textMuted,
  },
  expectedValue: {
    fontSize: 15,
    fontWeight: '800',
    color: WarehouseColors.text,
    fontVariant: ['tabular-nums'],
  },
  success: {
    flex: 1,
    backgroundColor: WarehouseColors.successSoft,
    borderRadius: WarehouseRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: WarehouseSpacing.xl,
    gap: 8,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: WarehouseColors.success },
  successValue: { fontSize: 16, fontWeight: '800', color: WarehouseColors.text },
  successHint: { fontSize: 12, fontWeight: '600', color: WarehouseColors.textMuted },
  mismatch: {
    backgroundColor: WarehouseColors.warningSoft,
    borderWidth: 1.5,
    borderColor: WarehouseColors.warningBorder,
    borderRadius: WarehouseRadius.md,
    padding: WarehouseSpacing.md,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mismatchTitle: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  mismatchHint: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  mismatchExpected: { fontSize: 12, fontWeight: '700', color: '#92400e', marginTop: 4 },
});
