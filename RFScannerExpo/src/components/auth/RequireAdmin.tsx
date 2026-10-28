import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import { useSession } from '@/context/SessionContext';

/** Renders children only for authenticated administrators. */
export function RequireAdmin({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAdmin, user } = useSession();
  if (!user) {
    return (
      fallback ?? (
        <View style={styles.box}>
          <Text style={styles.text}>Authentication required.</Text>
        </View>
      )
    );
  }
  if (!isAdmin) {
    return (
      fallback ?? (
        <View style={styles.box}>
          <Text style={styles.text}>Administrator access required.</Text>
        </View>
      )
    );
  }
  return children;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: WarehouseColors.dangerSoft,
    borderRadius: WarehouseRadius.md,
    padding: WarehouseSpacing.md,
  },
  text: {
    color: WarehouseColors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});
