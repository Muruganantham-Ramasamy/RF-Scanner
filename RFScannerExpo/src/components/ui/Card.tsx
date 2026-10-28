import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarehouseColors.card,
    borderRadius: WarehouseRadius.card,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    padding: WarehouseSpacing.lg,
    gap: WarehouseSpacing.md,
  },
});
