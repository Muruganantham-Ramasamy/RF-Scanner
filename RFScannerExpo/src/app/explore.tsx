import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WarehouseColors } from '@/constants/warehouseTheme';

/**
 * Kept for compatibility with the Expo starter route.
 * Primary navigation is the warehouse dashboard at `/`.
 */
export default function ExploreScreen() {
  return (
    <Screen>
      <ScreenHeader title="About" subtitle="RF Scanner Expo" />
      <Card>
        <Text style={styles.title}>Warehouse mobile console</Text>
        <Text style={styles.body}>
          This Expo Go app ports the RF Scanner picking and receiving demo workflows to native
          Android. Use the dashboard modules for day-to-day operations.
        </Text>
        <Button label="Back to Dashboard" onPress={() => router.replace('/')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: WarehouseColors.navy,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: WarehouseColors.textSecondary,
  },
});
