import { type ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import {
  PhoneMaxWidth,
  WarehouseColors,
  WarehouseSpacing,
} from '@/constants/warehouseTheme';

type ScreenShellProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Mobile RF terminal frame shared by all post-login screens.
 * Constrains content to PhoneMaxWidth so wide web/desktop viewports
 * match the Login phone chrome instead of stretching like a dashboard.
 */
export function ScreenShell({ children, style }: ScreenShellProps) {
  return (
    <View style={styles.outer}>
      <View style={[styles.shell, style]}>{children}</View>
    </View>
  );
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
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      bounces={false}>
      {children}
    </ScrollView>
  );
}

/** Non-scrolling body for screens that host CameraView. */
export function FlexBody({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.flexBody, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: WarehouseColors.chrome,
    alignItems: 'center',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: PhoneMaxWidth,
    backgroundColor: WarehouseColors.background,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderRadius: 28,
        marginVertical: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
      },
      default: {},
    }),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: WarehouseSpacing.md,
    paddingBottom: WarehouseSpacing.xxl,
    gap: WarehouseSpacing.md,
    flexGrow: 1,
  },
  flexBody: {
    flex: 1,
    paddingHorizontal: WarehouseSpacing.lg,
    paddingTop: WarehouseSpacing.sm,
    gap: WarehouseSpacing.sm,
    minHeight: 0,
  },
});
