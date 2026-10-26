import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WarehouseColors, WarehouseSpacing } from '@/constants/warehouseTheme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

export function ScreenHeader({ title, subtitle, showBack = true }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.backSpacer} />
      )}
      <View style={styles.titles}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.backSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.sm,
    paddingTop: WarehouseSpacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WarehouseColors.white,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    lineHeight: 30,
    color: WarehouseColors.navy,
    marginTop: -2,
  },
  backSpacer: {
    width: 40,
  },
  titles: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: WarehouseColors.navy,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: WarehouseColors.textSecondary,
    textAlign: 'center',
  },
});
