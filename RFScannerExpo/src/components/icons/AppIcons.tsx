/**
 * App icon set — Ionicons / MaterialCommunityIcons via @expo/vector-icons.
 * Names and roles mirror the original Vite RF Scanner SVG icons.
 */

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { WarehouseColors } from '@/constants/warehouseTheme';

type IonName = ComponentProps<typeof Ionicons>['name'];
type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type IconBaseProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const MUTED = '#b0b0cc';
const ACCENT = WarehouseColors.accent;
const NAV_IDLE = WarehouseColors.textMuted;

export function IconHome({
  active = false,
  size = 24,
  color,
}: IconBaseProps & { active?: boolean }) {
  return (
    <Ionicons
      name={active ? 'home' : 'home-outline'}
      size={size}
      color={color ?? (active ? ACCENT : NAV_IDLE)}
    />
  );
}

export function IconScan({
  active = false,
  size = 24,
  color,
}: IconBaseProps & { active?: boolean }) {
  return (
    <MaterialCommunityIcons
      name="qrcode-scan"
      size={size}
      color={color ?? (active ? ACCENT : NAV_IDLE)}
    />
  );
}

export function IconActivity({
  active = false,
  size = 24,
  color,
}: IconBaseProps & { active?: boolean }) {
  return (
    <Ionicons
      name="pulse"
      size={size}
      color={color ?? (active ? ACCENT : NAV_IDLE)}
    />
  );
}

export function IconProfile({
  active = false,
  size = 24,
  color,
}: IconBaseProps & { active?: boolean }) {
  return (
    <Ionicons
      name={active ? 'person' : 'person-outline'}
      size={size}
      color={color ?? (active ? ACCENT : NAV_IDLE)}
    />
  );
}

export function IconBox({
  muted = false,
  size = 28,
  color,
}: IconBaseProps & { muted?: boolean }) {
  return <Ionicons name="cube-outline" size={size} color={color ?? (muted ? MUTED : ACCENT)} />;
}

export function IconArchive({
  muted = false,
  size = 28,
  color,
}: IconBaseProps & { muted?: boolean }) {
  return (
    <Ionicons name="archive-outline" size={size} color={color ?? (muted ? MUTED : ACCENT)} />
  );
}

export function IconTruck({
  muted = false,
  size = 28,
  color,
}: IconBaseProps & { muted?: boolean }) {
  return (
    <MaterialCommunityIcons
      name="truck-delivery-outline"
      size={size}
      color={color ?? (muted ? MUTED : ACCENT)}
    />
  );
}

export function IconFactory({
  muted = false,
  size = 28,
  color,
}: IconBaseProps & { muted?: boolean }) {
  return (
    <MaterialCommunityIcons
      name="factory"
      size={size}
      color={color ?? (muted ? MUTED : ACCENT)}
    />
  );
}

export function IconInternal({
  muted = false,
  size = 28,
  color,
}: IconBaseProps & { muted?: boolean }) {
  return (
    <MaterialCommunityIcons
      name="swap-horizontal-bold"
      size={size}
      color={color ?? (muted ? MUTED : ACCENT)}
    />
  );
}

export function IconWarehouseOrder({
  muted = false,
  size = 28,
  color,
}: IconBaseProps & { muted?: boolean }) {
  return (
    <MaterialCommunityIcons
      name="clipboard-list-outline"
      size={size}
      color={color ?? (muted ? MUTED : ACCENT)}
    />
  );
}

export function IconLock({ size = 20, color = MUTED }: IconBaseProps) {
  return <Ionicons name="lock-closed-outline" size={size} color={color} />;
}

export function IconChevronRight({ size = 20, color = ACCENT }: IconBaseProps) {
  return <Ionicons name="chevron-forward" size={size} color={color} />;
}

export function IconBack({ size = 22, color = '#FFFFFF' }: IconBaseProps) {
  return <Ionicons name="chevron-back" size={size} color={color} />;
}

export function IconLogout({ size = 20, color = '#FFFFFF' }: IconBaseProps) {
  return <Ionicons name="log-out-outline" size={size} color={color} />;
}

export function IconQR({ size = 56, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="qrcode" size={size} color={color} />;
}

export function IconBarcode({ size = 28, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="barcode-scan" size={size} color={color} />;
}

export function IconCamera({ size = 24, color = ACCENT }: IconBaseProps) {
  return <Ionicons name="camera-outline" size={size} color={color} />;
}

export function IconKeypad({ size = 22, color = ACCENT }: IconBaseProps) {
  return <Ionicons name="keypad-outline" size={size} color={color} />;
}

export function IconWarning({ size = 18, color = WarehouseColors.warning }: IconBaseProps) {
  return <Ionicons name="warning" size={size} color={color} />;
}

export function IconPlay({ size = 22, color = '#FFFFFF' }: IconBaseProps) {
  return <Ionicons name="play" size={size} color={color} />;
}

export function IconHash({ size = 18, color = NAV_IDLE }: IconBaseProps) {
  return <MaterialCommunityIcons name="pound" size={size} color={color} />;
}

export function IconSuccess({ size = 40, color = WarehouseColors.success }: IconBaseProps) {
  return <Ionicons name="checkmark-circle" size={size} color={color} />;
}

export function IconClock({ size = 12, color = NAV_IDLE }: IconBaseProps) {
  return <Ionicons name="time-outline" size={size} color={color} />;
}

export function IconPrint({ size = 22, color = ACCENT }: IconBaseProps) {
  return <Ionicons name="print-outline" size={size} color={color} />;
}

export function IconPackage({ size = 28, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="package-variant-closed" size={size} color={color} />;
}

export function IconBin({ size = 28, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="map-marker-outline" size={size} color={color} />;
}

export function IconQuantity({ size = 28, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="counter" size={size} color={color} />;
}

export function IconBatch({ size = 28, color = '#ea580c' }: IconBaseProps) {
  return <MaterialCommunityIcons name="tag-outline" size={size} color={color} />;
}

export function IconSupplier({ size = 28, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="domain" size={size} color={color} />;
}

export function IconPO({ size = 28, color = ACCENT }: IconBaseProps) {
  return <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />;
}

export function IconSettings({ size = 20, color = WarehouseColors.text }: IconBaseProps) {
  return <Ionicons name="settings-outline" size={size} color={color} />;
}

export function IconNotifications({ size = 20, color = WarehouseColors.text }: IconBaseProps) {
  return <Ionicons name="notifications-outline" size={size} color={color} />;
}

export function IconInfo({ size = 20, color = WarehouseColors.text }: IconBaseProps) {
  return <Ionicons name="information-circle-outline" size={size} color={color} />;
}

export function IconRadioSelected({ size = 22, color = ACCENT }: IconBaseProps) {
  return <Ionicons name="radio-button-on" size={size} color={color} />;
}

export function IconRadioIdle({ size = 22, color = '#c8c8e0' }: IconBaseProps) {
  return <Ionicons name="radio-button-off" size={size} color={color} />;
}

type StepId = 'wo' | 'source' | 'product' | 'batch' | 'quantity' | 'destination' | 'po' | 'supplier' | 'batchSerial';

const STEP_ICON: Record<
  StepId,
  { mci?: MciName; ion?: IonName; tint: string; bg: string; border: string }
> = {
  wo: {
    mci: 'file-document-outline',
    tint: ACCENT,
    bg: '#eef2ff',
    border: 'rgba(59,53,196,0.18)',
  },
  po: {
    mci: 'file-document-outline',
    tint: ACCENT,
    bg: '#eef2ff',
    border: 'rgba(59,53,196,0.18)',
  },
  source: {
    mci: 'view-grid-outline',
    tint: ACCENT,
    bg: '#eef2ff',
    border: 'rgba(59,53,196,0.18)',
  },
  destination: {
    mci: 'map-marker-radius-outline',
    tint: ACCENT,
    bg: '#eef2ff',
    border: 'rgba(59,53,196,0.18)',
  },
  product: {
    mci: 'package-variant-closed',
    tint: '#c2410c',
    bg: '#fff7ed',
    border: 'rgba(194,65,12,0.2)',
  },
  batch: {
    mci: 'tag-outline',
    tint: '#c2410c',
    bg: '#fff7ed',
    border: 'rgba(194,65,12,0.2)',
  },
  batchSerial: {
    mci: 'tag-outline',
    tint: '#c2410c',
    bg: '#fff7ed',
    border: 'rgba(194,65,12,0.2)',
  },
  supplier: {
    mci: 'domain',
    tint: ACCENT,
    bg: '#eef2ff',
    border: 'rgba(59,53,196,0.18)',
  },
  quantity: {
    ion: 'calculator-outline',
    tint: ACCENT,
    bg: '#eeeeff',
    border: ACCENT,
  },
};

/** Illustrated step glyph used in scan / summary screens (original StepFieldIcon). */
export function StepFieldIcon({
  stepId,
  size = 28,
  quantityValue,
  active = false,
}: {
  stepId: StepId;
  size?: number;
  quantityValue?: string;
  active?: boolean;
}) {
  const meta = STEP_ICON[stepId] ?? STEP_ICON.wo;
  const frame = size + (size >= 40 ? 20 : 12);

  return (
    <View
      style={[
        styles.stepFrame,
        {
          width: frame,
          height: frame,
          borderRadius: size >= 40 ? 16 : 12,
          backgroundColor: meta.bg,
          borderColor: meta.border,
          borderWidth: stepId === 'quantity' ? 2 : 1.5,
        },
        // Omit transform when inactive — RN processTransform crashes on null/undefined.
        active ? { transform: [{ scale: 1.02 }] as const } : null,
      ]}>
      {stepId === 'quantity' ? (
        <Text style={[styles.qtyText, { fontSize: Math.max(16, size * 0.55), color: meta.tint }]}>
          {quantityValue ?? '2'}
        </Text>
      ) : meta.mci ? (
        <MaterialCommunityIcons name={meta.mci} size={size} color={meta.tint} />
      ) : (
        <Ionicons name={meta.ion!} size={size} color={meta.tint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
