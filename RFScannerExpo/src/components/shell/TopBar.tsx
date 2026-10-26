import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconBack } from '@/components/icons/AppIcons';
import { WarehouseColors, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';

type TopBarProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
};

export function TopBar({ title, subtitle, showBack = false, onBack }: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack ?? (() => router.back())}
            style={styles.back}>
            <IconBack size={22} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: WarehouseColors.navy,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingBottom: WarehouseSpacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.sm,
  },
  back: {
    width: TouchMin,
    height: TouchMin,
    borderRadius: TouchMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backPlaceholder: {
    width: 8,
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: WarehouseColors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
});
