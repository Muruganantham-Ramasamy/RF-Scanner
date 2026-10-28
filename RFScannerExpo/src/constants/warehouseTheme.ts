/**
 * Visual language matched to the Login RF terminal chrome.
 * Primary: #3b35c4 · Shell: #17182F · Page: #eef0f5 · Text: #1a1a2e
 */

export const WarehouseColors = {
  /** Outer chrome behind the phone frame (matches Login). */
  chrome: '#17182F',
  navy: '#1a1a22',
  navyMid: '#2e2e38',
  navySoft: '#3a3a48',
  accent: '#3b35c4',
  accentSoft: '#eeeeff',
  white: '#FFFFFF',
  background: '#eef0f5',
  card: '#FFFFFF',
  border: '#e0e0ec',
  text: '#1a1a2e',
  textSecondary: '#5a5a7a',
  textMuted: '#9898b8',
  textFaint: '#b0b0cc',
  success: '#059669',
  successSoft: '#d1fae5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  warningBorder: '#fbbf24',
  danger: '#dc2626',
  dangerSoft: '#fff0f0',
  online: '#10B981',
  offline: '#94A3B8',
} as const;

export const WarehouseSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const WarehouseRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  /** Login-aligned card / CTA radius */
  card: 22,
} as const;

/** Phone-frame max width — keeps web/desktop preview consistent with Login. */
export const PhoneMaxWidth = 440;

export const TouchMin = 48;
