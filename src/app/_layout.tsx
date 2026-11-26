import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { DialogHost } from '../components/Dialog';
import { DataVersionProvider } from '../components/DataVersion';
import { PrefsProvider, usePrefs } from '../components/Prefs';
import { ProfileProvider } from '../components/ProfileContext';
import { ReminderSync } from '../components/Reminders';
import { DB_NAME, initDatabase } from '../db/client';
import { colors } from '../theme/colors';

function ThemedApp() {
  const { prefs } = usePrefs();
  // Re-mount the navigator when the look changes so every screen picks up the new colors.
  return (
    <DataVersionProvider key={`${prefs.theme}-${prefs.accent}`}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <DialogHost />
      <ReminderSync />
    </DataVersionProvider>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
      <ProfileProvider>
        <PrefsProvider>
          <ThemedApp />
        </PrefsProvider>
      </ProfileProvider>
    </SQLiteProvider>
  );
}
