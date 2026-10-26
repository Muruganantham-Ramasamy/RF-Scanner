import { type Href, router } from 'expo-router';
import { type ComponentType, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconArchive,
  IconBox,
  IconChevronRight,
  IconLock,
  IconTruck,
} from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';

type OpIcon = ComponentType<{ muted?: boolean; size?: number }>;

export type ModuleOperation = {
  id: string;
  label: string;
  desc: string;
  locked: boolean;
  Icon: OpIcon;
  href?: Href;
  onPress?: () => void;
};

/** Default ops from original ModuleProcessesScreen (all hubs). */
export const DEFAULT_MODULE_OPERATIONS: ModuleOperation[] = [
  {
    id: 'picking',
    label: 'Picking',
    desc: 'Pick products for warehouse orders',
    locked: false,
    Icon: IconArchive,
    href: '/picking-methods' as Href,
  },
  {
    id: 'packing',
    label: 'Packing',
    desc: 'Not implemented',
    locked: true,
    Icon: IconBox,
  },
  {
    id: 'loading',
    label: 'Loading',
    desc: 'Not implemented',
    locked: true,
    Icon: IconTruck,
  },
];

type ModuleProcessesProps = {
  title: string;
  subtitle: string;
  operations?: ModuleOperation[];
  /** Optional content above the operation list (e.g. inbound Receiving). */
  headerSlot?: ReactNode;
};

export function ModuleProcesses({
  title,
  subtitle,
  operations = DEFAULT_MODULE_OPERATIONS,
  headerSlot,
}: ModuleProcessesProps) {
  return (
    <ScreenShell>
      <TopBar title={title} subtitle={subtitle} showBack />
      <ScrollBody>
        {headerSlot}
        {operations.map((op) => (
          <Pressable
            key={op.id}
            disabled={op.locked}
            onPress={() => {
              if (op.locked) return;
              if (op.onPress) op.onPress();
              else if (op.href) router.push(op.href);
            }}
            style={[styles.card, op.locked && styles.cardLocked]}>
            <View style={[styles.icon, op.locked && styles.iconLocked]}>
              <op.Icon muted={op.locked} size={26} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.label, op.locked && styles.labelLocked]}>{op.label}</Text>
              <Text style={styles.desc}>{op.desc}</Text>
            </View>
            {op.locked ? (
              <IconLock size={18} color="#c0c0d8" />
            ) : (
              <IconChevronRight size={20} color={WarehouseColors.accent} />
            )}
          </Pressable>
        ))}
      </ScrollBody>
      <BottomNav active="home" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.xl,
    padding: WarehouseSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
    minHeight: TouchMin + 16,
  },
  cardLocked: { opacity: 0.65 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: WarehouseColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLocked: { backgroundColor: '#f4f4f8' },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: '800', color: WarehouseColors.text },
  labelLocked: { color: WarehouseColors.textMuted },
  desc: { marginTop: 2, fontSize: 12, color: WarehouseColors.textFaint },
});
