import { Text, View, type ColorValue } from 'react-native';
import { BottomTabBar, Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { SubTabProvider, SubTabRow } from '../../components/SubTabs';
import { colors } from '../../theme/colors';

function icon(glyph: string) {
  const TabIcon = ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
  return TabIcon;
}

/** Sub-tabs of the selected tab, stacked on top of the normal tab bar. */
function TabBarWithSubTabs(props: BottomTabBarProps) {
  const route = props.state.routes[props.state.index].name;
  return (
    <View>
      <SubTabRow route={route} />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <SubTabProvider>
      <Tabs
        tabBar={TabBarWithSubTabs}
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800', fontSize: 30, letterSpacing: -0.5 },
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.surface },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen name="fitness" options={{ title: 'Fitness', tabBarIcon: icon('🏋') }} />
        <Tabs.Screen name="food" options={{ title: 'Nutrition', tabBarIcon: icon('🍽') }} />
        <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('☀') }} />
        <Tabs.Screen name="health" options={{ title: 'Health', tabBarIcon: icon('♥') }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙') }} />
      </Tabs>
    </SubTabProvider>
  );
}
