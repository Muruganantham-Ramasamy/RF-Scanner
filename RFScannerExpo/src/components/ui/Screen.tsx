import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WarehouseColors, WarehouseSpacing } from '@/constants/warehouseTheme';

type ScreenProps = {
  children: ReactNode;
  /** Prefer false on screens that host CameraView (Android preview breaks in nested ScrollViews). */
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.padded, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WarehouseColors.background,
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
  },
});
