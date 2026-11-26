import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {children}
    </ScrollView>
  );
}

export function Button({ label, onPress, variant = 'primary' }: { label: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger' }) {
  const bg = variant === 'primary' ? colors.accent : 'transparent';
  const fg = variant === 'primary' ? '#06121F' : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: bg, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: variant === 'primary' ? 0 : 1, borderColor: variant === 'danger' ? colors.danger : colors.border }}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export const inputStyle = {
  get color() { return colors.text; },
  get backgroundColor() { return colors.surfaceAlt; },
  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 0,
};

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16 },
  section: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 10, letterSpacing: -0.3 },
  text: { color: colors.text, fontSize: 16 },
  dim: { color: colors.textDim, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#06121F' },
});

/** Styles are rebuilt when the theme changes (colors is updated in place). */
let cache: { key: string; value: ReturnType<typeof makeStyles> } | null = null;
export const styles = new Proxy({} as ReturnType<typeof makeStyles>, {
  get(_, prop: string) {
    const key = colors.bg + colors.accent;
    if (!cache || cache.key !== key) cache = { key, value: makeStyles() };
    return cache.value[prop as keyof ReturnType<typeof makeStyles>];
  },
});
