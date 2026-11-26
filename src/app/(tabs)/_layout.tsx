import { Pressable, Text, type ColorValue } from 'react-native';
import { router, Tabs } from 'expo-router';
import { colors } from '../../theme/colors';

function icon(glyph: string) {
  const TabIcon = ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
  return TabIcon;
}

function SettingsButton() {
  return (
    <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={{ marginRight: 16 }}>
      <Text style={{ color: colors.textDim, fontSize: 22 }}>⚙</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
        headerRight: SettingsButton,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('☀') }} />
      <Tabs.Screen name="fitness" options={{ title: 'Fitness', tabBarIcon: icon('🏋') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('🍽') }} />
      <Tabs.Screen name="health" options={{ title: 'Health', tabBarIcon: icon('♥') }} />
    </Tabs>
  );
}
