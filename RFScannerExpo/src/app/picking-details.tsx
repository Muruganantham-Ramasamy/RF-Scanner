import { type Href, router, Redirect } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconPlay } from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import {
  canEnterPickingDetails,
  usePickingSession,
} from '@/context/PickingSessionContext';
import {
  getActivePickingDocument,
  getConsolidatedPickingDetailRows,
  getPickingMethodMeta,
} from '@/services/picking/pickingDataSource';

export default function PickingDetailsScreen() {
  const { method, gate, flowTitle } = usePickingSession();
  const methodMeta = getPickingMethodMeta(method);
  const document = useMemo(() => getActivePickingDocument(method), [method]);
  const detailRows = useMemo(() => getConsolidatedPickingDetailRows(document), [document]);

  if (!canEnterPickingDetails(gate, method)) {
    return <Redirect href={'/scan-wo' as Href} />;
  }

  return (
    <ScreenShell>
      <TopBar
        title="Picking Details"
        subtitle={`${methodMeta.label} · Review then Start`}
        showBack
      />
      <View style={styles.body}>
        <View style={styles.tableCard}>
          <View style={styles.tableHead}>
            <Text style={styles.tableTitle}>Picking Details</Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
          <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
            {detailRows.map((row, i) => (
              <View
                key={row.key}
                style={[styles.row, i < detailRows.length - 1 && styles.rowBorder]}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={styles.rowValue} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.flowHint}>{flowTitle}</Text>

        <Pressable
          onPress={() => router.push('/picking-execution' as Href)}
          style={styles.startBtn}>
          <IconPlay size={20} color="#FFFFFF" />
          <Text style={styles.startBtnText}>Start Picking</Text>
        </Pressable>
      </View>
      <BottomNav active="scan" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: WarehouseSpacing.sm,
    paddingBottom: WarehouseSpacing.md,
    gap: WarehouseSpacing.sm,
    minHeight: 0,
  },
  tableCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    paddingHorizontal: WarehouseSpacing.md,
    paddingVertical: WarehouseSpacing.sm,
  },
  tableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: WarehouseColors.text,
  },
  activePill: {
    backgroundColor: WarehouseColors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: { color: WarehouseColors.success, fontWeight: '800', fontSize: 10 },
  tableScroll: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    minHeight: 28,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f8' },
  rowLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: WarehouseColors.text },
  rowValue: {
    maxWidth: '48%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  flowHint: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
  },
  startBtn: {
    minHeight: TouchMin,
    borderRadius: WarehouseRadius.xl,
    backgroundColor: WarehouseColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startBtnText: {
    color: WarehouseColors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
