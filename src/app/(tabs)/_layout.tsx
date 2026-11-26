import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../theme/colors';

const icon = (glyph: string) => ({ color }: { color: import("react-native").ColorValue }) => (
  <Text style={{ color, fontSize: 18 }}>{glyph}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: icon('☰') }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: icon('◆') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙') }} />
    </Tabs>
  );
}
