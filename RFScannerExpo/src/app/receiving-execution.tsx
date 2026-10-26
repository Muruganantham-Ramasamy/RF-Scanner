import { type Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSuccess, IconWarning, StepFieldIcon } from '@/components/icons/AppIcons';
import { BarcodeScanner, type ScanDisposition } from '@/components/scanner/BarcodeScanner';
import { BottomNav } from '@/components/shell/BottomNav';
import { FlexBody, ScreenShell } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { Button } from '@/components/ui/Button';
import { QuantityEntry } from '@/components/warehouse/QuantityEntry';
import { StepProgress } from '@/components/warehouse/StepProgress';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import { RECEIVING_UI_TERMS } from '@/services/receiving/receivingUiTerms';
import {
  clearReceivingFailure,
  createInitialReceivingState,
  DEMO_RECEIVING,
  EXPECTED_BY_RECEIVING_STEP,
  getReceivingStepStatus,
  quantityErrorMessage,
  RECEIVING_STEP_ORDER,
  verifyReceivingStep,
  type ReceivingStepId,
  type ReceivingWorkflowState,
} from '@/services/receiving/receivingWorkflow';
const SUCCESS_FLASH_MS = 900;

export default function ReceivingExecutionScreen() {
  const [workflow, setWorkflow] = useState<ReceivingWorkflowState>(() => createInitialReceivingState());
  const [justVerified, setJustVerified] = useState<ReceivingStepId | null>(null);
  const workflowRef = useRef(workflow);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  workflowRef.current = workflow;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (workflow.complete && !justVerified) {
      const t = setTimeout(() => router.replace('/goods-receipt' as Href), 400);
      return () => clearTimeout(t);
    }
  }, [workflow.complete, justVerified]);

  const step = workflow.current;
  const term = RECEIVING_UI_TERMS[step];
  const expected = EXPECTED_BY_RECEIVING_STEP[step];
  const isQuantity = step === 'quantity';
  const showFlash = justVerified !== null;

  const progressSteps = RECEIVING_STEP_ORDER.map((id) => ({
    id,
    label: RECEIVING_UI_TERMS[id].shortLabel,
    status: getReceivingStepStatus(workflow, id),
  }));

  function flash(stepId: ReceivingStepId) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setJustVerified(stepId);
    timerRef.current = setTimeout(() => {
      setJustVerified(null);
      timerRef.current = null;
    }, SUCCESS_FLASH_MS);
  }

  /** Validation only — BarcodeScanner owns duplicate/busy gating. */
  function submitRaw(raw: string): ScanDisposition {
    const completed = workflowRef.current.current;
    const result = verifyReceivingStep(workflowRef.current, raw);
    setWorkflow(result.state);
    workflowRef.current = result.state;

    if (result.ok) {
      flash(completed);
      return true;
    }
    return false;
  }

  return (
    <ScreenShell>
      <TopBar title="Receiving by PO" subtitle={term.scanTitle} showBack />
      <FlexBody>
        <StepProgress steps={progressSteps} />

        {showFlash && justVerified ? (
          <View style={styles.flash}>
            <IconSuccess size={48} />
            <Text style={styles.flashTitle}>{RECEIVING_UI_TERMS[justVerified].label} verified</Text>
            <Text style={styles.flashHint}>Continuing…</Text>
          </View>
        ) : (
          <>
            <View style={styles.guide}>
              <StepFieldIcon
                stepId={step}
                size={36}
                active
                quantityValue={DEMO_RECEIVING.quantity}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.guideTitle}>{term.scanTitle}</Text>
                <Text style={styles.guideHelper}>{term.scanHelper}</Text>
              </View>
            </View>

            {isQuantity ? (
              <QuantityEntry
                title={term.scanTitle}
                helper={term.scanHelper}
                expectedHint={expected}
                uom={DEMO_RECEIVING.uom}
                onSubmit={(v) => {
                  submitRaw(v);
                }}
              />
            ) : (
              <BarcodeScanner
                title={term.scanTitle}
                helper={term.scanHelper}
                expectedHint={expected}
                resetKey={`${step}-${workflow.verified.length}`}
                fill
                enabled={!showFlash}
                onScanned={submitRaw}
              />
            )}

            {workflow.failureKind ? (
              <View style={styles.mismatch}>
                <IconWarning size={18} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.mismatchTitle}>{term.mismatchTitle}</Text>
                  <Text style={styles.mismatchHint}>
                    {workflow.current === 'quantity'
                      ? quantityErrorMessage(workflow.failureKind)
                      : 'Please scan the correct barcode.'}
                  </Text>
                  <Text style={styles.mismatchExpected}>Expected: {expected}</Text>
                  <Button
                    label="Clear & Retry"
                    variant="secondary"
                    onPress={() => setWorkflow((s) => clearReceivingFailure(s))}
                  />
                </View>
              </View>
            ) : null}
          </>
        )}

        <Text style={styles.demo}>Demo / mock receiving — no SAP Goods Receipt posting</Text>
      </FlexBody>
      <BottomNav active="scan" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideTitle: { fontSize: 15, fontWeight: '800', color: WarehouseColors.text },
  guideHelper: { fontSize: 12, fontWeight: '600', color: WarehouseColors.textSecondary, marginTop: 2 },
  flash: {
    flex: 1,
    backgroundColor: WarehouseColors.successSoft,
    borderRadius: WarehouseRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: WarehouseSpacing.xl,
    gap: 8,
  },
  flashTitle: { fontSize: 18, fontWeight: '800', color: WarehouseColors.success },
  flashHint: { fontSize: 12, fontWeight: '600', color: WarehouseColors.textMuted },
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
  mismatchExpected: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  demo: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
  },
});
