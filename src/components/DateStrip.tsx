import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** Local YYYY-MM-DD for a day offset from `base`. */
const iso = (base: Date, offset: number) => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const DAYS = 21; // three weeks back
const W = 48;

/** Selected date title + a scrollable row of days (3 weeks back, 1 week ahead) and a Today button. */
export function DateStrip({ offset, onChange }: { offset: number; onChange: (offset: number) => void }) {
  const base = useRef(new Date()).current;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = Array.from({ length: DAYS + 8 }, (_, i) => i - DAYS);
  const selected = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, (offset + DAYS - 3) * W), animated: true });
  }, [offset]);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>
          {selected.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => onChange(0)} disabled={offset === 0}
          style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.surface, opacity: offset === 0 ? 0.5 : 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>Today</Text>
        </Pressable>
      </View>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
        onLayout={() => scroll.current?.scrollTo({ x: Math.max(0, (offset + DAYS - 3) * W), animated: false })}>
        {offsets.map((o) => {
          const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + o);
          const active = o === offset;
          return (
            <Pressable key={iso(base, o)} onPress={() => onChange(o)}
              style={{ width: W - 4, marginRight: 4, paddingVertical: 6, borderRadius: 12, alignItems: 'center', backgroundColor: active ? colors.surface : 'transparent' }}>
              <Text style={{ color: o === 0 ? colors.accent : colors.textDim, fontSize: 11, fontWeight: '700' }}>
                {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </Text>
              <Text style={{ color: active ? colors.text : colors.textDim, fontSize: 18, fontWeight: '800' }}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
