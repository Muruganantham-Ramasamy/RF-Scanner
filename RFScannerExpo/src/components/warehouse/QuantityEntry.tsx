import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconHash, IconQuantity, IconSuccess } from '@/components/icons/AppIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';

type QuantityEntryProps = {
  title: string;
  helper: string;
  expectedHint: string;
  uom?: string;
  /** Original prefills required AQty when the quantity step opens. */
  initialValue?: string;
  onSubmit: (value: string) => void;
};

/** Quantity confirmation — matches the original web flow (manual numeric entry primary). */
export function QuantityEntry({
  title,
  helper,
  expectedHint,
  uom,
  initialValue = '',
  onSubmit,
}: QuantityEntryProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Card>
        <View style={styles.titleRow}>
          <IconQuantity size={22} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.helper}>{helper}</Text>
        <View style={styles.expected}>
          <Text style={styles.expectedLabel}>EXPECTED</Text>
          <View style={styles.expectedRow}>
            <IconHash size={14} color={WarehouseColors.textMuted} />
            <Text style={styles.expectedValue}>{expectedHint}</Text>
          </View>
          {uom ? <Text style={styles.uom}>UOM: {uom}</Text> : null}
        </View>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder={uom ? `Quantity (${uom})` : 'Quantity'}
          placeholderTextColor={WarehouseColors.textMuted}
          style={styles.input}
        />
        <Button
          label="Confirm Quantity"
          disabled={!value.trim()}
          onPress={() => onSubmit(value.trim())}
        />
        <View style={styles.confirmHint}>
          <IconSuccess size={16} color={WarehouseColors.accent} />
          <Text style={styles.confirmHintText}>Confirm only after counting the picked units</Text>
        </View>
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    color: WarehouseColors.textSecondary,
  },
  expected: {
    backgroundColor: WarehouseColors.background,
    borderRadius: WarehouseRadius.sm,
    padding: WarehouseSpacing.md,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    gap: 4,
  },
  expectedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WarehouseColors.textMuted,
  },
  expectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expectedValue: {
    fontSize: 15,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  uom: {
    fontSize: 11,
    fontWeight: '700',
    color: WarehouseColors.textMuted,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    borderRadius: WarehouseRadius.md,
    paddingHorizontal: WarehouseSpacing.md,
    color: WarehouseColors.text,
    backgroundColor: WarehouseColors.background,
    fontWeight: '700',
    fontSize: 18,
  },
  confirmHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmHintText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: WarehouseColors.textMuted,
  },
});
