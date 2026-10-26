import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconArchive, IconPackage, IconWarning } from '@/components/icons/AppIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WarehouseColors, WarehouseRadius, WarehouseSpacing } from '@/constants/warehouseTheme';
import {
  filterInventory,
  loadInventory,
  type InventoryItem,
  type InventoryLoadResult,
} from '@/services/inventory/inventoryData';

/**
 * NON-ORIGINAL: The Vite RF Scanner home tile "Physical Inv." is a no-op (no screen).
 * This route is retained only as an optional demo lookup and is not on the home grid.
 */
export default function InventoryScreen() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<InventoryLoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadInventory();
      setResult(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const items: InventoryItem[] = result
    ? filterInventory(result.items, query)
    : [];

  return (
    <Screen>
      <ScreenHeader title="Inventory" subtitle="Stock lookup" />

      <Card>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search product, barcode, or location"
          placeholderTextColor={WarehouseColors.textMuted}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button label="Refresh" variant="secondary" onPress={() => void refresh()} />
      </Card>

      {result?.warning ? (
        <Card style={styles.warnCard}>
          <View style={styles.warnHead}>
            <IconWarning size={18} />
            <Text style={styles.warnTitle}>
              {result.source === 'demo' ? 'Demo data' : 'Notice'}
            </Text>
          </View>
          <Text style={styles.warnBody}>{result.warning}</Text>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <ActivityIndicator color={WarehouseColors.accent} />
          <Text style={styles.helper}>Loading inventory…</Text>
        </Card>
      ) : null}

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load inventory</Text>
          <Text style={styles.helper}>{error}</Text>
          <Button label="Retry" onPress={() => void refresh()} />
        </Card>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Card>
          <View style={styles.warnHead}>
            <IconArchive size={22} muted />
            <Text style={styles.emptyTitle}>No matching items</Text>
          </View>
          <Text style={styles.helper}>Try a different product, barcode, or bin search.</Text>
        </Card>
      ) : null}

      {items.map((item) => (
        <Card key={item.id}>
          <View style={styles.warnHead}>
            <IconPackage size={20} />
            <Text style={styles.productName}>{item.productName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Product</Text>
            <Text style={styles.value}>{item.product}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Barcode</Text>
            <Text style={styles.value}>{item.barcode}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{item.location}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Batch</Text>
            <Text style={styles.value}>{item.batch}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Qty</Text>
            <Text style={styles.value}>
              {item.quantity} {item.uom}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: WarehouseColors.border,
    borderRadius: WarehouseRadius.md,
    paddingHorizontal: WarehouseSpacing.md,
    color: WarehouseColors.navy,
    backgroundColor: WarehouseColors.background,
    fontWeight: '600',
  },
  warnCard: {
    backgroundColor: WarehouseColors.accentSoft,
  },
  warnHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warnTitle: {
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  warnBody: {
    fontSize: 12,
    lineHeight: 17,
    color: WarehouseColors.textSecondary,
  },
  helper: {
    fontSize: 13,
    color: WarehouseColors.textSecondary,
  },
  errorCard: {
    backgroundColor: WarehouseColors.dangerSoft,
  },
  errorTitle: {
    fontWeight: '800',
    color: WarehouseColors.danger,
  },
  emptyTitle: {
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: WarehouseSpacing.md,
    paddingVertical: 4,
  },
  label: {
    color: WarehouseColors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  value: {
    color: WarehouseColors.text,
    fontWeight: '800',
    fontSize: 13,
  },
});

