import { type Href, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  IconHash,
  IconLock,
  IconProfile,
  IconQR,
  IconWarning,
} from '@/components/icons/AppIcons';
import { PhoneMaxWidth, WarehouseColors } from '@/constants/warehouseTheme';
import { useSession } from '@/context/SessionContext';

const LOGIN_BG = WarehouseColors.chrome;
const PANEL_DARK = '#1a1a2a';
const PANEL_LIGHT = WarehouseColors.background;
const CARD_STRIP = '#5b57c7';
const ICON_LAVENDER = WarehouseColors.accentSoft;
const INPUT_BORDER = '#d8d8ea';
const BTN_IDLE = '#C9C8DF';
const BTN_READY = WarehouseColors.accent;

export default function LoginScreen() {
  const { signIn } = useSession();
  const insets = useSafeAreaInsets();
  const [warehouse, setWarehouse] = useState('WH01');
  const [resource, setResource] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!warehouse.trim() || !resource.trim() || !password.trim()) {
      setError('Enter warehouse, resource/email, and password to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Resource doubles as the auth email/username (admin uses info@…).
      const result = await signIn({
        email: resource.trim(),
        password,
        warehouse,
        resource,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace('/' as Href);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(
    warehouse.trim() && resource.trim() && password.trim() && !submitting,
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.panel}>
        <View style={styles.panelTop} pointerEvents="none" />
        <View style={styles.panelBottom} pointerEvents="none" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.card}>
              <View style={styles.cardStrip} />

              <View style={styles.cardBody}>
                <View style={styles.headerBlock}>
                  <View style={styles.heroIcon}>
                    <IconQR size={30} color={WarehouseColors.accent} />
                  </View>
                  <Text style={styles.title}>Login</Text>
                </View>

                <Field
                  label="Warehouse"
                  value={warehouse}
                  onChange={(v) => {
                    setWarehouse(v);
                    setError(null);
                  }}
                  placeholder="e.g. WH01"
                  autoCapitalize="characters"
                  icon={<IconHash size={18} color={WarehouseColors.textMuted} />}
                />
                <Field
                  label="Resource / Email"
                  value={resource}
                  onChange={(v) => {
                    setResource(v);
                    setError(null);
                  }}
                  placeholder="Resource ID or email"
                  autoComplete="username"
                  keyboardType="email-address"
                  icon={<IconProfile size={18} color={WarehouseColors.textMuted} />}
                />
                <Field
                  label="Password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setError(null);
                  }}
                  placeholder="Enter password"
                  secureTextEntry
                  autoComplete="password"
                  icon={<IconLock size={18} color={WarehouseColors.textMuted} />}
                  onSubmitEditing={canSubmit ? () => void handleLogin() : undefined}
                />

                {error ? (
                  <View style={styles.errorBox}>
                    <IconWarning size={18} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit }}
                  disabled={!canSubmit}
                  onPress={() => void handleLogin()}
                  style={({ pressed }) => [
                    styles.loginBtn,
                    { backgroundColor: canSubmit ? BTN_READY : BTN_IDLE },
                    canSubmit && pressed ? styles.loginBtnPressed : null,
                    canSubmit ? styles.loginBtnReadyShadow : null,
                  ]}>
                  <Text style={styles.loginBtnLabel}>{submitting ? 'Signing in…' : 'Login'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
  keyboardType,
  icon,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'username' | 'password' | 'off';
  keyboardType?: 'default' | 'email-address';
  icon: ReactNode;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={WarehouseColors.textMuted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          autoCorrect={false}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={secureTextEntry ? 'go' : 'next'}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LOGIN_BG,
    paddingHorizontal: 14,
  },
  panel: {
    flex: 1,
    maxWidth: PhoneMaxWidth,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: PANEL_LIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '28%',
    backgroundColor: PANEL_DARK,
  },
  panelBottom: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PANEL_LIGHT,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  card: {
    backgroundColor: WarehouseColors.white,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(224,224,236,0.95)',
    shadowColor: '#0b0b1a',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardStrip: {
    height: 4,
    width: '100%',
    backgroundColor: CARD_STRIP,
  },
  cardBody: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 16,
  },
  headerBlock: {
    alignItems: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: ICON_LAVENDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: WarehouseColors.text,
    letterSpacing: -0.3,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: WarehouseColors.text,
  },
  inputShell: {
    borderWidth: 2,
    borderColor: INPUT_BORDER,
    borderRadius: 20,
    backgroundColor: '#fafafa',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIcon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: WarehouseColors.text,
    minHeight: 48,
    paddingVertical: 10,
  },
  errorBox: {
    backgroundColor: WarehouseColors.warningSoft,
    borderWidth: 1.5,
    borderColor: WarehouseColors.warningBorder,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#92400e',
    fontSize: 13,
    fontWeight: '700',
  },
  loginBtn: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnReadyShadow: {
    shadowColor: BTN_READY,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  loginBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  loginBtnLabel: {
    color: WarehouseColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
