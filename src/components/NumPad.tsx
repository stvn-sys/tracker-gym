import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** RIR chip colors: red (to failure) → green → blue (easy). Index = RIR, 5 means 5+. */
export const RIR_COLORS = ['#E5484D', '#F76B15', '#F5B400', '#C2C93B', '#3DDC97', '#4FA8FF'];

interface Props {
  field: 'weight' | 'reps';
  rir: number | null;
  onKey: (key: string) => void;
  onRir: (rir: number | null) => void;
  onDone: () => void;
  /** Weight-only quick steps, e.g. [{label:'+2', delta: 2}]. */
  steps?: { label: string; deltaKg: number }[];
  onStep?: (deltaKg: number) => void;
}

export function NumPad({ field, rir, onKey, onRir, onDone, steps, onStep }: Props) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', field === 'weight' ? '.' : '', '0', '⌫'];
  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.textDim, fontSize: 12, width: 28 }}>RIR</Text>
        {RIR_COLORS.map((c, i) => (
          <Pressable
            key={i}
            onPress={() => onRir(rir === i ? null : i)}
            style={{
              flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
              backgroundColor: rir === i ? c : 'transparent', borderWidth: 2, borderColor: c,
            }}
          >
            <Text style={{ color: rir === i ? '#0B0D17' : c, fontWeight: '800' }}>{i === 5 ? '5+' : i}</Text>
          </Pressable>
        ))}
      </View>
      {field === 'weight' && steps && steps.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {steps.map((s) => (
            <Pressable key={s.label} onPress={() => onStep?.(s.deltaKg)} style={stepBtn}>
              <Text style={{ color: s.deltaKg < 0 ? colors.textDim : colors.accent, fontWeight: '700' }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 3, flexDirection: 'row', flexWrap: 'wrap' }}>
          {keys.map((k, i) => (
            <Pressable key={i} disabled={!k} onPress={() => onKey(k)} style={{ width: '33.33%', height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 24 }}>{k}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onDone} style={{ flex: 1, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#06121F', fontSize: 16, fontWeight: '800' }}>{field === 'weight' ? 'Next' : 'Done'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const stepBtn = {
  flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  borderWidth: 1, borderColor: colors.border,
} as const;
