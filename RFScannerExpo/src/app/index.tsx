import { type Href, router } from 'expo-router';
import { type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconArchive,
  IconBox,
  IconFactory,
  IconHome,
  IconInternal,
  IconLogout,
  IconTruck,
  IconWarehouseOrder,
} from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import { useSession } from '@/context/SessionContext';

type ModuleIconProps = { muted?: boolean; size?: number };

type ModuleDef = {
  code: string;
  label: string;
  href: Href;
  Icon: ComponentType<ModuleIconProps>;
};

/** Matches frontend/src HomeScreen — all six modules open process hubs. */
const MODULES: ModuleDef[] = [
  { code: '01', label: 'Production', href: '/production' as Href, Icon: IconFactory },
  { code: '02', label: 'Inbound', href: '/inbound' as Href, Icon: IconTruck },
  { code: '03', label: 'Outbound', href: '/outbound' as Href, Icon: IconBox },
  { code: '04', label: 'Physical Inv.', href: '/physical-inventory' as Href, Icon: IconArchive },
  { code: '05', label: 'Internal', href: '/internal' as Href, Icon: IconInternal },
  { code: '06', label: 'WO Selection', href: '/wo-selection' as Href, Icon: IconWarehouseOrder },
];

/** Original HomeScreen hardcodes these display values — not live API data. */
const DEMO_STATS = [
  { label: 'Open WOs', value: '14', color: WarehouseColors.accent },
  { label: 'Picked Today', value: '38', color: WarehouseColors.success },
  { label: 'Pending', value: '6', color: WarehouseColors.warning },
];

export default function HomeScreen() {
  const { user, signOut } = useSession();
  const resource = user?.resource || 'Muruga';
  const warehouse = user?.warehouse || 'WH01';
  const initial = resource.charAt(0).toUpperCase() || 'M';

  return (
    <ScreenShell>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Warehouse RF</Text>
          <Text style={styles.headerSub}>RF Terminal Client</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Pressable
            accessibilityLabel="Log out"
            onPress={() => {
              signOut();
              router.replace('/login' as Href);
            }}
            style={styles.logoutBtn}>
            <IconLogout size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollBody>
        <View style={styles.userCard}>
          <Text style={styles.loggedLabel}>Logged in user</Text>
          <View style={styles.userRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {resource}
              </Text>
              <View style={styles.whPill}>
                <Text style={styles.whPillText}>Warehouse: {warehouse}</Text>
              </View>
            </View>
            <View style={styles.homeGlyph}>
              <IconHome active size={26} />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Modules</Text>
        <View style={styles.grid}>
          {MODULES.map((mod) => (
            <Pressable
              key={mod.code}
              onPress={() => router.push(mod.href)}
              style={styles.moduleCard}>
              <View style={styles.moduleIcon}>
                <mod.Icon size={26} />
              </View>
              <Text style={styles.moduleCode}>{mod.code}</Text>
              <Text style={styles.moduleLabel}>{mod.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.demoStatsNote}>Demo statistics (not live warehouse data)</Text>
        <View style={styles.statsRow}>
          {DEMO_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollBody>

      <BottomNav active="home" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: WarehouseColors.navy,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
  },
  headerText: { flex: 1, minWidth: 0 },
  brand: { color: WarehouseColors.white, fontSize: 22, fontWeight: '800' },
  headerSub: { marginTop: 2, color: '#9ca3af', fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  avatar: {
    width: TouchMin,
    height: TouchMin,
    borderRadius: TouchMin / 2,
    backgroundColor: WarehouseColors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WarehouseColors.white, fontWeight: '800', fontSize: 16 },
  logoutBtn: {
    width: TouchMin,
    height: TouchMin,
    borderRadius: TouchMin / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.lg,
  },
  loggedLabel: { fontSize: 12, color: WarehouseColors.textMuted },
  userRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center', gap: 12 },
  userName: { fontSize: 22, fontWeight: '800', color: WarehouseColors.text },
  whPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: WarehouseColors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  whPillText: { color: WarehouseColors.accent, fontWeight: '800', fontSize: 12 },
  homeGlyph: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: WarehouseColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WarehouseColors.text,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
    minHeight: 110,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: WarehouseColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCode: { fontSize: 10, fontWeight: '800', color: WarehouseColors.textMuted },
  moduleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: WarehouseColors.text,
    textAlign: 'center',
  },
  demoStatsNote: {
    fontSize: 10,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
    paddingHorizontal: 4,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: WarehouseColors.textMuted,
    textAlign: 'center',
  },
});
