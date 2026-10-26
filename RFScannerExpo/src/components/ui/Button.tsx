import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}>
      <Text style={[styles.label, variant === 'secondary' || variant === 'ghost' ? styles.darkLabel : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: WarehouseRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: WarehouseSpacing.lg,
  },
  label: {
    color: WarehouseColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  darkLabel: {
    color: WarehouseColors.navy,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: WarehouseColors.accent },
  secondary: {
    backgroundColor: WarehouseColors.accentSoft,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
  },
  danger: { backgroundColor: WarehouseColors.danger },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: WarehouseColors.border,
  },
};
