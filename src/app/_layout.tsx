import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { DialogHost } from '../components/Dialog';
import { DataVersionProvider } from '../components/DataVersion';
import { ProfileProvider } from '../components/ProfileContext';
import { DB_NAME, initDatabase } from '../db/client';
import { colors } from '../theme/colors';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
      <ProfileProvider>
        <DataVersionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
          <DialogHost />
        </DataVersionProvider>
      </ProfileProvider>
    </SQLiteProvider>
  );
}
