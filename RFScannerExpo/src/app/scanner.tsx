import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconBarcode } from '@/components/icons/AppIcons';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { FlexBody, ScreenShell } from '@/components/shell/ScreenShell';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { WarehouseColors, WarehouseSpacing } from '@/constants/warehouseTheme';

/**
 * Debug / standalone scanner — not part of the original bottom-nav primary path
 * (original Scan tab opens Scan WO). Kept for camera diagnostics only.
 */
export default function ScannerScreen() {
  const [value, setValue] = useState<string | null>(null);

  return (
    <ScreenShell>
      <TopBar
        title="Barcode Scanner"
        subtitle="Diagnostic camera scan (not a warehouse workflow)"
        showBack
      />
      <FlexBody>
        <BarcodeScanner
          title="Scan any warehouse barcode"
          helper="Supports QR, Code 128, Code 39, EAN, and UPC formats where available on this device."
          fill
          resetKey={value ?? 'idle'}
          onScanned={(scanned) => {
            setValue(scanned);
            return true;
          }}
        />
        {value ? (
          <Card>
            <View style={styles.valueHead}>
              <IconBarcode size={22} />
              <Text style={styles.label}>SCANNED VALUE</Text>
            </View>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.note}>
              Manual entry or a decoded camera value proves capture plumbing only. Physical camera
              decode must be confirmed on an Android device. Use Picking / Receiving for workflow
              validation.
            </Text>
          </Card>
        ) : null}
      </FlexBody>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  valueHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WarehouseColors.textMuted,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: WarehouseColors.text,
  },
  note: {
    marginTop: WarehouseSpacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: WarehouseColors.textSecondary,
  },
});
