import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconHome, IconSuccess, StepFieldIcon } from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import { RECEIVING_UI_TERMS, receivingDisplayValue } from '@/services/receiving/receivingUiTerms';
import { DEMO_RECEIVING, RECEIVING_STEP_ORDER } from '@/services/receiving/receivingWorkflow';

export default function GoodsReceiptScreen() {
  return (
    <ScreenShell>
      <TopBar
        title="Goods Receipt"
        subtitle="Receiving confirmation (demo)"
        showBack
        onBack={() => router.replace('/' as Href)}
      />
      <ScrollBody>
        <View style={styles.hero}>
          <IconSuccess size={64} />
          <Text style={styles.title}>Goods Receipt Ready</Text>
          <Text style={styles.desc}>
            All receiving checks completed for PO {DEMO_RECEIVING.purchaseOrder}.
          </Text>
          <Text style={styles.disclaimer}>
            Demo / mock receiving — no SAP Goods Receipt posting
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receiving Summary</Text>
          {RECEIVING_STEP_ORDER.map((id, i) => (
            <View
              key={id}
              style={[styles.row, i < RECEIVING_STEP_ORDER.length - 1 && styles.rowBorder]}>
              <View style={styles.left}>
                <StepFieldIcon
                  stepId={id === 'batchSerial' ? 'batchSerial' : id}
                  size={22}
                  quantityValue={DEMO_RECEIVING.quantity}
                />
                <Text style={styles.rowLabel}>{RECEIVING_UI_TERMS[id].label}</Text>
              </View>
              <Text style={styles.rowValue}>{receivingDisplayValue(id)}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.homeBtn} onPress={() => router.replace('/' as Href)}>
          <IconHome size={20} color="#FFFFFF" />
          <Text style={styles.homeText}>Return to Home</Text>
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
  title: { fontSize: 20, fontWeight: '800', color: WarehouseColors.text },
  desc: {
    fontSize: 13,
    fontWeight: '600',
    color: WarehouseColors.textSecondary,
    textAlign: 'center',
  },
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
    marginBottom: 8,
    color: WarehouseColors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f8' },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: WarehouseColors.text },
  rowValue: {
    maxWidth: '42%',
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: WarehouseColors.text,
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
  homeText: { color: WarehouseColors.white, fontWeight: '800', fontSize: 15 },
});
