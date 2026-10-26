import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { WarehouseColors } from '@/constants/warehouseTheme';
import { PickingSessionProvider } from '@/context/PickingSessionContext';
import { SessionProvider } from '@/context/SessionContext';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'login',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SessionProvider>
      <PickingSessionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: WarehouseColors.background },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="index" />
          <Stack.Screen name="production" />
          <Stack.Screen name="outbound" />
          <Stack.Screen name="inbound" />
          <Stack.Screen name="physical-inventory" />
          <Stack.Screen name="internal" />
          <Stack.Screen name="wo-selection" />
          <Stack.Screen name="scan-po" />
          <Stack.Screen name="receiving-execution" />
          <Stack.Screen name="goods-receipt" />
          <Stack.Screen name="picking-methods" />
          <Stack.Screen name="scan-wo" />
          <Stack.Screen name="picking-details" />
          <Stack.Screen name="picking-execution" />
          <Stack.Screen name="picking-complete" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="picking" />
          <Stack.Screen name="receiving" />
          <Stack.Screen name="inventory" />
          <Stack.Screen name="scanner" />
          <Stack.Screen name="explore" />
        </Stack>
      </PickingSessionProvider>
    </SessionProvider>
  );
}
