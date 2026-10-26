import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  IconActivity,
  IconHome,
  IconProfile,
  IconScan,
} from '@/components/icons/AppIcons';
import { WarehouseColors, TouchMin } from '@/constants/warehouseTheme';

export type BottomTab = 'home' | 'scan' | 'activity' | 'profile';

type BottomNavProps = {
  active: BottomTab;
};

const TABS: { key: BottomTab; label: string; href: Href }[] = [
  { key: 'home', label: 'Home', href: '/' as Href },
  { key: 'scan', label: 'Scan', href: '/scan-wo' as Href },
  { key: 'activity', label: 'Activity', href: '/activity' as Href },
  { key: 'profile', label: 'Profile', href: '/profile' as Href },
];

export function BottomNav({ active }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            onPress={() => router.replace(tab.href)}
            style={styles.tab}>
            {tab.key === 'home' ? (
              <IconHome active={isActive} size={22} />
            ) : tab.key === 'scan' ? (
              <IconScan active={isActive} size={22} />
            ) : tab.key === 'activity' ? (
              <IconActivity active={isActive} size={22} />
            ) : (
              <IconProfile active={isActive} size={22} />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: WarehouseColors.white,
    borderTopWidth: 1,
    borderTopColor: WarehouseColors.border,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchMin,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
  },
  labelActive: {
    color: WarehouseColors.accent,
  },
});
