import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconChevronRight } from '@/components/icons/AppIcons';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';

type ModuleCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
};

export function ModuleCard({ icon, title, description, onPress }: ModuleCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <IconChevronRight size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    padding: WarehouseSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: WarehouseColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: WarehouseColors.textSecondary,
  },
});
