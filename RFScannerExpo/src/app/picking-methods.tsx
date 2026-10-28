import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconChevronRight,
  IconRadioIdle,
  IconRadioSelected,
} from '@/components/icons/AppIcons';
import { BottomNav } from '@/components/shell/BottomNav';
import { ScreenShell, ScrollBody } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { Button } from '@/components/ui/Button';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing, TouchMin } from '@/constants/warehouseTheme';
import { usePickingSession } from '@/context/PickingSessionContext';
import {
  PICKING_METHODS,
  type PickingMethodId,
} from '@/services/picking/pickingDataSource';

/**
 * Original continueWithMethod:
 * - by-wo → scan-wo (WO gate)
 * - other methods → picking-details (WO scanned inside execution)
 */
export default function PickingMethodsScreen() {
  const { setMethod } = usePickingSession();
  const [selected, setSelected] = useState<PickingMethodId>('by-wo');
  const selectedMeta = PICKING_METHODS.find((m) => m.id === selected);

  function continueWithMethod() {
    setMethod(selected);
    if (selected === 'by-wo') {
      router.push('/scan-wo' as Href);
      return;
    }
    router.push('/picking-details' as Href);
  }

  return (
    <ScreenShell>
      <TopBar title="Picking Methods" subtitle="How would you like to pick?" showBack />
      <ScrollBody>
        {PICKING_METHODS.map((m) => {
          const isSelected = selected === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelected(m.id)}
              style={[styles.card, isSelected && styles.cardSelected]}>
              {isSelected ? <IconRadioSelected size={22} /> : <IconRadioIdle size={22} />}
              <View style={styles.copy}>
                <Text style={[styles.label, !isSelected && styles.labelMuted]}>{m.label}</Text>
                {m.sub ? <Text style={styles.sub}>{m.sub}</Text> : null}
              </View>
              <IconChevronRight
                size={20}
                color={isSelected ? WarehouseColors.accent : '#c8c8e0'}
              />
            </Pressable>
          );
        })}

        <Button
          label={`Continue with ${selectedMeta?.label ?? 'Picking'}`}
          onPress={continueWithMethod}
          style={styles.continue}
        />
      </ScrollBody>
      <BottomNav active="home" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: WarehouseRadius.card,
    padding: WarehouseSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: WarehouseSpacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: TouchMin + 8,
  },
  cardSelected: {
    borderColor: WarehouseColors.accent,
  },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: '700', color: WarehouseColors.text },
  labelMuted: { color: '#5a5a7a' },
  sub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: WarehouseColors.accent,
  },
  continue: {
    backgroundColor: WarehouseColors.navy,
    marginTop: 8,
  },
});
