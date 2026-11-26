import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../theme/colors';
import { useDataVersion } from '../DataVersion';
import { Card, styles } from '../ui';

/**
 * Loads data when the screen gains focus and whenever any card reports a change.
 * `deps` are extra values (like the selected date) that should trigger a reload.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]): [T | undefined, () => void] {
  const { version, bump } = useDataVersion();
  const [data, setData] = useState<T>();
  // The caller lists the loader's inputs in `deps`, like a normal hook dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const load = useCallback(loader, deps);
  useFocusEffect(useCallback(() => {
    let live = true;
    load().then((d) => { if (live) setData(d); });
    return () => { live = false; };
  // `version` is intentionally a trigger: reload when another card changed data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, version]));
  return [data, bump];
}

export function WidgetCard({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textDim, fontWeight: '700', letterSpacing: 0.5, fontSize: 13 }}>{title.toUpperCase()}</Text>
        {action && (
          <Pressable onPress={onAction} hitSlop={10}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accentDim }}>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </Card>
  );
}

export function Bar({ value, color = colors.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: value > 1 ? colors.danger : color }} />
    </View>
  );
}

export function BigValue({ value, unit, sub }: { value: string; unit?: string; sub?: string }) {
  return (
    <View>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>
        {value}{unit ? <Text style={{ fontSize: 15, color: colors.textDim, fontWeight: '600' }}> {unit}</Text> : null}
      </Text>
      {sub ? <Text style={styles.dim}>{sub}</Text> : null}
    </View>
  );
}

export const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
