import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** Sub-tabs per bottom tab (route name → sections). The first one is the default. */
export const SUBTABS: Record<string, string[]> = {
  fitness: ['Routines', 'Log', 'Library', 'Ranks'],
  health: ['Metrics', 'Weight', 'Measurements', 'Photo Progress'],
  settings: ['Profile', 'Goals'],
};

const Ctx = createContext<{ active: Record<string, string>; set: (route: string, sub: string) => void }>({
  active: {}, set: () => {},
});

export function SubTabProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Record<string, string>>({});
  const set = useCallback((route: string, sub: string) => setActive((a) => ({ ...a, [route]: sub })), []);
  return <Ctx.Provider value={{ active, set }}>{children}</Ctx.Provider>;
}

/** Current sub-tab of a bottom tab. */
export function useSubTab(route: string): string {
  const { active } = useContext(Ctx);
  return active[route] ?? SUBTABS[route]?.[0] ?? '';
}

/** The row of sub-tabs shown directly above the bottom tab bar. */
export function SubTabRow({ route }: { route: string }) {
  const { set } = useContext(Ctx);
  const current = useSubTab(route);
  const subs = SUBTABS[route] ?? [];
  if (!subs.length) return null;
  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexGrow: 1, justifyContent: 'center' }}>
        {subs.map((s) => {
          const on = s === current;
          return (
            <Pressable key={s} onPress={() => set(route, s)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: on ? colors.accent : colors.surfaceAlt }}>
              <Text style={{ color: on ? '#06121F' : colors.text, fontWeight: '700', fontSize: 13 }}>{s}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
