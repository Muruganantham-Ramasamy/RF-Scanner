import { type Href, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconWarning, StepFieldIcon } from '@/components/icons/AppIcons';
import { BarcodeScanner, type ScanDisposition } from '@/components/scanner/BarcodeScanner';
import { BottomNav } from '@/components/shell/BottomNav';
import { FlexBody, ScreenShell } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { StepProgress } from '@/components/warehouse/StepProgress';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import { RECEIVING_UI_TERMS } from '@/services/receiving/receivingUiTerms';
import {
  createPrePoReceivingState,
  DEMO_RECEIVING,
  verifyReceivingStep,
  type ReceivingWorkflowState,
} from '@/services/receiving/receivingWorkflow';

export default function ScanPurchaseOrderScreen() {
  const [workflow, setWorkflow] = useState<ReceivingWorkflowState>(() => createPrePoReceivingState());
  const workflowRef = useRef(workflow);
  workflowRef.current = workflow;

  const term = RECEIVING_UI_TERMS.po;

  /** Validation only — BarcodeScanner owns duplicate/busy gating. */
  function onScan(raw: string): ScanDisposition {
    const result = verifyReceivingStep(workflowRef.current, raw);
    setWorkflow(result.state);
    workflowRef.current = result.state;

    if (result.ok) {
      setTimeout(() => router.push('/receiving-execution' as Href), 600);
      return true;
    }
    return false;
  }

  return (
    <ScreenShell>
      <TopBar title="Receiving by PO" subtitle="Scan or enter Purchase Order" showBack />
      <FlexBody>
        <StepProgress
          steps={[
            {
              id: 'po',
              label: 'PO',
              status: workflow.verified.includes('po')
                ? 'verified'
                : workflow.failureKind
                  ? 'failed'
                  : 'current',
            },
            { id: 'supplier', label: 'Supp.', status: 'waiting' },
            { id: 'product', label: 'Prod.', status: 'waiting' },
            { id: 'batch', label: 'Batch', status: 'waiting' },
            { id: 'qty', label: 'Qty', status: 'waiting' },
            { id: 'dst', label: 'DstBin', status: 'waiting' },
          ]}
        />
        <View style={styles.guide}>
          <StepFieldIcon stepId="po" size={36} active />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.guideTitle}>{term.scanTitle}</Text>
            <Text style={styles.guideHelper}>{term.scanHelper}</Text>
          </View>
        </View>
        <BarcodeScanner
          title={term.scanTitle}
          helper={term.scanHelper}
          expectedHint={DEMO_RECEIVING.purchaseOrder}
          resetKey="po-gate"
          fill
          onScanned={onScan}
        />
        {workflow.failureKind ? (
          <View style={styles.mismatch}>
            <IconWarning size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mismatchTitle}>{term.mismatchTitle}</Text>
              <Text style={styles.mismatchExpected}>Expected: {DEMO_RECEIVING.purchaseOrder}</Text>
            </View>
          </View>
        ) : null}
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
  mismatchExpected: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  demo: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
  },
});
