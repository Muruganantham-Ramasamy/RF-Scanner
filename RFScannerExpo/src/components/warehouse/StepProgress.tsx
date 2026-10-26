import { StyleSheet, Text, View } from 'react-native';

import { WarehouseColors, WarehouseSpacing } from '@/constants/warehouseTheme';

export type ProgressStep = {
  id: string;
  label: string;
  status: 'verified' | 'current' | 'waiting' | 'failed';
};

export function StepProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <View style={styles.row}>
      {steps.map((step) => {
        const active = step.status === 'current' || step.status === 'failed';
        const done = step.status === 'verified';
        return (
          <View key={step.id} style={styles.item}>
            <View
              style={[
                styles.dot,
                done && styles.dotDone,
                active && styles.dotActive,
                step.status === 'failed' && styles.dotFailed,
              ]}>
              <Text
                style={[
                  styles.dotText,
                  (done || active) && styles.dotTextActive,
                ]}>
                {done ? '✓' : step.label.slice(0, 1)}
              </Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    backgroundColor: WarehouseColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    paddingVertical: WarehouseSpacing.md,
    paddingHorizontal: WarehouseSpacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: WarehouseColors.accentSoft,
    borderWidth: 1.5,
    borderColor: WarehouseColors.accent,
  },
  dotDone: {
    backgroundColor: WarehouseColors.successSoft,
  },
  dotFailed: {
    backgroundColor: WarehouseColors.dangerSoft,
    borderColor: WarehouseColors.danger,
  },
  dotText: {
    fontSize: 10,
    fontWeight: '800',
    color: WarehouseColors.textMuted,
  },
  dotTextActive: {
    color: WarehouseColors.navy,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
  },
  labelActive: {
    color: WarehouseColors.accent,
  },
});
