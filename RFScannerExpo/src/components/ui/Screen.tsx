import { type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PhoneMaxWidth,
  WarehouseColors,
  WarehouseSpacing,
} from '@/constants/warehouseTheme';

type ScreenProps = {
  children: ReactNode;
  /** Prefer false on screens that host CameraView (Android preview breaks in nested ScrollViews). */
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/** Secondary screens (inventory / explore) — same phone frame as ScreenShell. */
export function Screen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  return (
    <View style={styles.outer}>
      <SafeAreaView
        style={[styles.safe, style]}
        edges={['top', 'left', 'right', 'bottom']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            bounces={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.padded, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: WarehouseColors.chrome,
    alignItems: 'center',
  },
  safe: {
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
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: WarehouseSpacing.lg,
    paddingBottom: WarehouseSpacing.lg,
    gap: WarehouseSpacing.md,
  },
  content: {
    paddingHorizontal: WarehouseSpacing.lg,
    paddingBottom: WarehouseSpacing.xxl,
    gap: WarehouseSpacing.lg,
    flexGrow: 1,
  },
});
