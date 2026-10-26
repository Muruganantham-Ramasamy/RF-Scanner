import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { WarehouseColors, WarehouseSpacing } from '@/constants/warehouseTheme';

type ScreenShellProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/** Full-height phone shell matching original max-width RF terminal layout. */
export function ScreenShell({ children, style }: ScreenShellProps) {
  return <View style={[styles.shell, style]}>{children}</View>;
}

type ScrollBodyProps = {
  children: ReactNode;
  contentStyle?: ViewStyle;
};

export function ScrollBody({ children, contentStyle }: ScrollBodyProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/** Non-scrolling body for screens that host CameraView. */
export function FlexBody({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.flexBody, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: WarehouseColors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: WarehouseSpacing.md,
    paddingBottom: WarehouseSpacing.xxl,
    gap: WarehouseSpacing.md,
  },
  flexBody: {
    flex: 1,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: WarehouseSpacing.sm,
    gap: WarehouseSpacing.sm,
    minHeight: 0,
  },
});
