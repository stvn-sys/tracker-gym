import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useKeyboardHeight } from '../components/useKeyboardHeight';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { DialogHost } from '../components/Dialog';
import { DataVersionProvider } from '../components/DataVersion';
import { PrefsProvider, usePrefs } from '../components/Prefs';
import { ProfileProvider } from '../components/ProfileContext';
import { ReminderSync } from '../components/Reminders';
import { AutoMacrosSync, HealthSync } from '../components/HealthSync';
import { DB_NAME, initDatabase } from '../db/client';
import { colors } from '../theme/colors';

function ThemedApp() {
  const { prefs } = usePrefs();
  const keyboard = useKeyboardHeight();
  // Re-mount the navigator when the look changes so every screen picks up the new colors.
  return (
    <DataVersionProvider key={`${prefs.theme}-${prefs.accent}`}>
      <StatusBar style="light" />
      {/* Lifts every screen above the keyboard so the focused field stays visible. */}
      <View style={{ flex: 1, paddingBottom: keyboard, backgroundColor: colors.bg }}>
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
      </View>
      <DialogHost />
      <ReminderSync />
      <HealthSync />
      <AutoMacrosSync />
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
