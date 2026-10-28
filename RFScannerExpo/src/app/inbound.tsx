import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconChevronRight, IconPO } from '@/components/icons/AppIcons';
import {
  DEFAULT_MODULE_OPERATIONS,
  ModuleProcesses,
} from '@/components/warehouse/ModuleProcesses';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';

/**
 * Canonical App uses ModuleProcesses for inbound (Picking/Packing/Loading).
 * ReceivingScreens still exist in the original codebase but were unreachable from
 * home — Expo restores Receiving by PO above the shared hub ops.
 */
export default function InboundScreen() {
  return (
    <ModuleProcesses
      title="Inbound Processes"
      subtitle="Select an operation"
      operations={DEFAULT_MODULE_OPERATIONS}
      headerSlot={
        <Pressable
          onPress={() => router.push('/scan-po' as Href)}
          style={styles.receivingCard}>
          <View style={styles.icon}>
            <IconPO size={26} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>Receiving by PO</Text>
            <Text style={styles.desc}>Scan or enter a Purchase Order (demo — no SAP GR)</Text>
          </View>
          <IconChevronRight size={20} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  receivingCard: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.card,
    padding: WarehouseSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
    minHeight: TouchMin + 16,
    borderWidth: 1.5,
    borderColor: WarehouseColors.accentSoft,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: WarehouseColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: '800', color: WarehouseColors.text },
  desc: { marginTop: 2, fontSize: 12, color: WarehouseColors.textSecondary },
});
