import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconActivity } from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import { useSession } from '@/context/SessionContext';

const ACTIVITIES = [
  { time: '14:32', action: 'WO 200028 started', user: 'Muruga', status: 'active', color: WarehouseColors.accent },
  { time: '13:15', action: 'WO 200021 completed', user: 'Muruga', status: 'done', color: WarehouseColors.success },
  { time: '12:48', action: 'WO 200019 picked', user: 'Muruga', status: 'done', color: WarehouseColors.success },
  { time: '11:20', action: 'WO 200015 cancelled', user: 'Muruga', status: 'cancel', color: WarehouseColors.danger },
  { time: '10:05', action: 'WO 200010 completed', user: 'Muruga', status: 'done', color: WarehouseColors.success },
];

export default function ActivityScreen() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const initial = (user?.resource || 'Muruga').charAt(0).toUpperCase();

  return (
    <ScreenShell>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Activity Log</Text>
          <Text style={styles.sub}>Recent warehouse operations</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>

      <ScrollBody>
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: WarehouseColors.accent }]}>38</Text>
            <Text style={styles.statLabel}>Picks Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: WarehouseColors.success }]}>94%</Text>
            <Text style={styles.statLabel}>Accuracy Rate</Text>
          </View>
        </View>

        <Text style={styles.section}>TODAY&apos;S OPERATIONS</Text>

        {ACTIVITIES.map((act, i) => (
          <View key={`${act.time}-${i}`} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: `${act.color}18` }]}>
              <IconActivity active={act.status === 'active'} size={20} color={act.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.action} numberOfLines={1}>
                {act.action}
              </Text>
              <Text style={styles.meta}>
                {act.user} · {act.time}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${act.color}18` }]}>
              <Text style={[styles.statusText, { color: act.color }]}>{act.status}</Text>
            </View>
          </View>
        ))}
      </ScrollBody>
      <BottomNav active="activity" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: WarehouseColors.navy,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
  },
  title: { color: WarehouseColors.white, fontSize: 22, fontWeight: '800' },
  sub: { marginTop: 2, color: '#9ca3af', fontSize: 12 },
  avatar: {
    width: TouchMin,
    height: TouchMin,
    borderRadius: TouchMin / 2,
    backgroundColor: WarehouseColors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WarehouseColors.white, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.lg,
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { marginTop: 4, fontSize: 11, fontWeight: '600', color: WarehouseColors.textMuted },
  section: {
    fontSize: 11,
    fontWeight: '800',
    color: WarehouseColors.textMuted,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { fontSize: 13, fontWeight: '700', color: WarehouseColors.text },
  meta: { marginTop: 2, fontSize: 11, color: WarehouseColors.textMuted },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
});
