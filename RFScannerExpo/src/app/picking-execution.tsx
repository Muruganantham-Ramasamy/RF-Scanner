import { type Href, router, Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  IconClock,
  IconSuccess,
  IconWarning,
  StepFieldIcon,
} from '@/components/icons/AppIcons';
import { BarcodeScanner, type ScanDisposition } from '@/components/scanner/BarcodeScanner';
import { BottomNav } from '@/components/shell/BottomNav';
import { FlexBody, ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { Button } from '@/components/ui/Button';
import { QuantityEntry } from '@/components/warehouse/QuantityEntry';
import { StepProgress } from '@/components/warehouse/StepProgress';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import {
  canEnterPickingDetails,
  usePickingSession,
} from '@/context/PickingSessionContext';
import {
  expectedBarcodeForStep,
  getActivePickingDocument,
} from '@/services/picking/pickingDataSource';
import {
  movingToNextLabel,
  PICKING_UI_TERMS,
  verifiedSuccessLabel,
  VERIFICATION_SUMMARY_UI,
} from '@/services/picking/pickingUiTerms';
import {
  clearStepFailure,
  createInitialPickingState,
  getStepStatus,
  verifyCurrentStep,
  type PickingStepId,
  type PickingWorkflowState,
} from '@/services/picking/pickingWorkflow';

const SUCCESS_FLASH_MS = 900;

export default function PickingExecutionScreen() {
  const { method, gate, flowTitle, verifiedWoForExecution } = usePickingSession();
  const document = useMemo(() => getActivePickingDocument(method), [method]);
  const allowed = canEnterPickingDetails(gate, method);

  const [workflow, setWorkflow] = useState<PickingWorkflowState>(() =>
    createInitialPickingState({
      document,
      alreadyVerified: verifiedWoForExecution
        ? { wo: verifiedWoForExecution }
        : undefined,
    }),
  );
  const [justVerified, setJustVerified] = useState<{
    stepId: PickingStepId;
    value: string;
  } | null>(null);
  const workflowRef = useRef(workflow);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  workflowRef.current = workflow;

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  if (!allowed) {
    return <Redirect href={'/scan-wo' as Href} />;
  }

  const showSuccessFlash = justVerified !== null;
  const showSummary = workflow.complete && !showSuccessFlash;
  const activeStepId = workflow.current;
  const term = PICKING_UI_TERMS[activeStepId];
  const expected = expectedBarcodeForStep(activeStepId, document);
  const isQuantity = activeStepId === 'quantity';

  const progressSteps = workflow.stepOrder.map((id) => ({
    id,
    label: PICKING_UI_TERMS[id].shortLabel,
    status: getStepStatus(workflow, id),
  }));

  function flashSuccess(stepId: PickingStepId, value: string) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setJustVerified({ stepId, value });
    successTimerRef.current = setTimeout(() => {
      setJustVerified(null);
      successTimerRef.current = null;
    }, SUCCESS_FLASH_MS);
  }

  /** Validation only — BarcodeScanner owns the scan session / duplicate gate. */
  function onScan(raw: string): ScanDisposition {
    const completedStepId = workflowRef.current.current;
    const result = verifyCurrentStep(workflowRef.current, raw, document);
    setWorkflow(result.state);
    workflowRef.current = result.state;

    if (result.ok) {
      const value =
        result.state.verifiedValues?.[completedStepId] ??
        expectedBarcodeForStep(completedStepId, document);
      flashSuccess(completedStepId, value);
      return true;
    }
    return false;
  }

  if (showSummary) {
    return (
      <ScreenShell>
        <TopBar title={flowTitle} subtitle={VERIFICATION_SUMMARY_UI.title} showBack />
        <ScrollBody>
          <StepProgress steps={progressSteps} />
          <View style={styles.summaryHero}>
            <IconSuccess size={52} />
            <Text style={styles.summaryTitle}>{VERIFICATION_SUMMARY_UI.title}</Text>
            <Text style={styles.summaryDesc}>{VERIFICATION_SUMMARY_UI.description}</Text>
          </View>
          <View style={styles.card}>
            {workflow.stepOrder.map((id, i) => {
              const verifiedAt = workflow.verifiedAt?.[id];
              return (
                <View
                  key={id}
                  style={[styles.row, i < workflow.stepOrder.length - 1 && styles.rowBorder]}>
                  <View style={styles.summaryLeft}>
                    <StepFieldIcon stepId={id} size={22} quantityValue={document.quantity} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowLabel}>{PICKING_UI_TERMS[id].label}</Text>
                      {verifiedAt ? (
                        <View style={styles.timeRow}>
                          <IconClock size={11} />
                          <Text style={styles.timeText}>
                            {new Date(verifiedAt).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.rowValue}>
                    {workflow.verifiedValues?.[id] ?? expectedBarcodeForStep(id, document)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Button
            label={VERIFICATION_SUMMARY_UI.continueLabel}
            onPress={() => router.replace('/picking-complete' as Href)}
          />
        </ScrollBody>
        <BottomNav active="scan" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <TopBar title={flowTitle} subtitle={term.scanTitle} showBack />
      <FlexBody>
        <StepProgress steps={progressSteps} />

        {showSuccessFlash && justVerified ? (
          <View style={styles.flash}>
            <IconSuccess size={48} />
            <Text style={styles.flashTitle}>{verifiedSuccessLabel(justVerified.stepId)}</Text>
            <Text style={styles.flashValue}>{justVerified.value}</Text>
            <Text style={styles.flashHint}>{movingToNextLabel(justVerified.stepId)}</Text>
          </View>
        ) : (
          <>
            <View style={styles.guide}>
              <StepFieldIcon
                stepId={activeStepId}
                size={36}
                active
                quantityValue={document.quantity}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.guideTitle}>{term.scanTitle}</Text>
                <Text style={styles.guideHelper}>{term.scanHelper}</Text>
              </View>
            </View>

            <View style={styles.expectedCard}>
              <Text style={styles.expectedLabel}>EXPECTED</Text>
              <Text style={styles.expectedValue}>{expected}</Text>
            </View>

            {isQuantity ? (
              <QuantityEntry
                key={`qty-${workflow.verified.length}`}
                title={term.scanTitle}
                helper={term.scanHelper}
                expectedHint={expected}
                uom={document.uom}
                initialValue={document.quantity}
                onSubmit={(v) => {
                  onScan(v);
                }}
              />
            ) : (
              <BarcodeScanner
                title={term.scanTitle}
                helper={term.scanHelper}
                expectedHint={expected}
                resetKey={`${activeStepId}-${workflow.verified.length}`}
                fill
                enabled={!showSuccessFlash}
                onScanned={onScan}
              />
            )}

            {workflow.failureKind ? (
              <View style={styles.mismatch}>
                <IconWarning size={18} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.mismatchTitle}>{term.mismatchTitle}</Text>
                  <Text style={styles.mismatchHint}>{term.mismatchHint}</Text>
                  <Text style={styles.mismatchExpected}>Expected: {expected}</Text>
                  {workflow.failedValue ? (
                    <Text style={styles.mismatchExpected}>Scanned: {workflow.failedValue}</Text>
                  ) : null}
                  <Button
                    label="Clear & Retry"
                    variant="secondary"
                    onPress={() => setWorkflow((s) => clearStepFailure(s))}
                  />
                </View>
              </View>
            ) : null}
          </>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expectedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WarehouseColors.textMuted,
  },
  expectedValue: {
    fontSize: 14,
    fontWeight: '800',
    color: WarehouseColors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
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
  flashValue: { fontSize: 15, fontWeight: '800', color: WarehouseColors.text },
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
  summaryHero: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: WarehouseColors.text },
  summaryDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: WarehouseColors.success,
    textAlign: 'center',
  },
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f8' },
  summaryLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: WarehouseColors.success },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timeText: { fontSize: 10, fontWeight: '600', color: WarehouseColors.textMuted },
  rowValue: {
    maxWidth: '42%',
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
});
