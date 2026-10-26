import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconChevronRight,
  IconInfo,
  IconNotifications,
  IconSettings,
} from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import { useSession } from '@/context/SessionContext';

const INFO = [
  { label: 'Role', value: 'Warehouse Operator' },
  { label: 'Terminal', value: 'RF-TERMINAL-01' },
  { label: 'Shift', value: 'Morning (06:00 - 14:00)' },
  { label: 'Session', value: 'WRF-2026-0821' },
];

const SETTINGS = [
  { label: 'App Settings', Icon: IconSettings },
  { label: 'Notification Preferences', Icon: IconNotifications },
  { label: 'About', Icon: IconInfo },
];

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const resource = user?.resource || 'Muruga';
  const warehouse = user?.warehouse || 'WH01';
  const initial = resource.charAt(0).toUpperCase();

  return (
    <ScreenShell>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollBody contentStyle={styles.body}>
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{resource}</Text>
          <View style={styles.whPill}>
            <Text style={styles.whPillText}>Warehouse: {warehouse}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {INFO.map((row, i) => (
            <View key={row.label} style={[styles.row, i < INFO.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          {SETTINGS.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.settingsRow, i < SETTINGS.length - 1 && styles.rowBorder]}>
              <View style={styles.settingsLeft}>
                <item.Icon size={18} color={WarehouseColors.text} />
                <Text style={styles.settingsLabel}>{item.label}</Text>
              </View>
              <IconChevronRight size={18} color="#c8c8e0" />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => {
            signOut();
            router.replace('/login' as Href);
          }}
          style={styles.signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollBody>
      <BottomNav active="profile" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: WarehouseColors.navy,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: { color: WarehouseColors.white, fontSize: 22, fontWeight: '800' },
  body: { marginTop: -24 },
  avatarCard: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: WarehouseColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WarehouseColors.white, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800', color: WarehouseColors.text },
  whPill: {
    backgroundColor: WarehouseColors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  whPillText: { color: WarehouseColors.accent, fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    paddingHorizontal: WarehouseSpacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f8' },
  rowLabel: { fontSize: 13, color: WarehouseColors.textMuted },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: WarehouseColors.text,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: TouchMin,
    paddingVertical: 8,
  },
  settingsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsLabel: { fontSize: 13, fontWeight: '700', color: WarehouseColors.text },
  signOut: {
    backgroundColor: WarehouseColors.dangerSoft,
    borderRadius: WarehouseRadius.xl,
    minHeight: TouchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  signOutText: {
    color: WarehouseColors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
});
