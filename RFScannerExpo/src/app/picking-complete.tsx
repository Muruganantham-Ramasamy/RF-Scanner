import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import {
  IconHome,
  IconPrint,
  IconSuccess,
  IconWarehouseOrder,
} from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import { usePickingSession } from '@/context/PickingSessionContext';
import {
  getActivePickingDocument,
  getConsolidatedPickingDetailRows,
} from '@/services/picking/pickingDataSource';
import { PICKING_COMPLETE_UI } from '@/services/picking/pickingUiTerms';

export default function PickingCompleteScreen() {
  const { method, flowTitle, resetGate } = usePickingSession();
  const document = useMemo(() => getActivePickingDocument(method), [method]);
  const detailRows = useMemo(() => getConsolidatedPickingDetailRows(document), [document]);
  const required = new Set(document.requiredVerificationSteps);

  async function handlePrint() {
    const lines = detailRows.map((row) => {
      const status =
        row.stepId != null && required.has(row.stepId) ? 'Verified' : '—';
      return `${row.label}: ${row.value} (${status})`;
    });
    const message = [
      `Picking Complete — ${flowTitle}`,
      `WO ${document.wo}`,
      '',
      ...lines,
      '',
      PICKING_COMPLETE_UI.disclaimer,
    ].join('\n');

    try {
      await Share.share({ message, title: PICKING_COMPLETE_UI.printLabel });
    } catch {
      Alert.alert(
        'Print unavailable',
        'Could not open the share sheet. Demo workflow only — no SAP print service is configured.',
      );
    }
  }

  return (
    <ScreenShell>
      <TopBar
        title={PICKING_COMPLETE_UI.title}
        subtitle={flowTitle}
        showBack
        onBack={() => {
          resetGate();
          router.replace('/' as Href);
        }}
      />
      <ScrollBody>
        <View style={styles.hero}>
          <IconSuccess size={64} />
          <Text style={styles.title}>{PICKING_COMPLETE_UI.title}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{PICKING_COMPLETE_UI.description}</Text>
          </View>
          <Text style={styles.disclaimer}>{PICKING_COMPLETE_UI.disclaimer}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Picking Details</Text>
          <Text style={styles.meta}>
            {flowTitle} · WO {document.wo}
          </Text>
          {detailRows.map((row, i) => {
            const wasVerified = row.stepId != null && required.has(row.stepId);
            return (
              <View
                key={row.key}
                style={[styles.row, i < detailRows.length - 1 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
                <Text style={[styles.status, wasVerified && styles.statusOk]}>
                  {wasVerified ? 'Verified' : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable style={styles.printBtn} onPress={() => void handlePrint()}>
          <IconPrint size={20} color={WarehouseColors.accent} />
          <Text style={styles.printText}>{PICKING_COMPLETE_UI.printLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            resetGate();
            router.replace('/picking-methods' as Href);
          }}>
          <IconWarehouseOrder size={20} color="#FFFFFF" />
          <Text style={styles.primaryText}>Back to Picking</Text>
        </Pressable>
        <Pressable
          style={styles.homeBtn}
          onPress={() => {
            resetGate();
            router.replace('/' as Href);
          }}>
          <IconHome size={20} color="#FFFFFF" />
          <Text style={styles.primaryText}>Return to Home</Text>
        </Pressable>
      </ScrollBody>
      <BottomNav active="home" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: WarehouseColors.text },
  pill: {
    backgroundColor: WarehouseColors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillText: { color: WarehouseColors.success, fontWeight: '800', fontSize: 11 },
  disclaimer: {
    fontSize: 11,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.lg,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: WarehouseColors.text,
  },
  meta: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    color: WarehouseColors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f8' },
  rowLabel: { flex: 1.2, fontSize: 12, fontWeight: '700', color: WarehouseColors.text },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  status: { width: 58, textAlign: 'right', fontSize: 11, fontWeight: '700', color: '#c0c0d8' },
  statusOk: { color: WarehouseColors.success },
  printBtn: {
    minHeight: TouchMin,
    borderRadius: WarehouseRadius.xl,
    backgroundColor: WarehouseColors.white,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  printText: { color: WarehouseColors.accent, fontWeight: '800', fontSize: 15 },
  primaryBtn: {
    minHeight: TouchMin,
    borderRadius: WarehouseRadius.xl,
    backgroundColor: WarehouseColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  homeBtn: {
    minHeight: TouchMin,
    borderRadius: WarehouseRadius.xl,
    backgroundColor: WarehouseColors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: WarehouseColors.white, fontWeight: '800', fontSize: 15 },
});
