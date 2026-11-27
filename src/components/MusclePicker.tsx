import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { groupOf, MUSCLE_GROUPS, MUSCLE_LABEL, MUSCLE_REGIONS, type Muscle } from '../data/muscles';
import { mixHex } from '../domain/volume';
import { colors } from '../theme/colors';
import { BodyMap } from './BodyMap';
import { Segmented } from './SettingsUI';
import { inputStyle, styles } from './ui';

type Mode = 'primary' | 'secondary';

/**
 * Primary + secondary muscle picker: tap muscles on the body map or in the
 * grouped list. Primary is filled, secondary is outlined.
 */
export function MusclePicker({ primary, secondary, onChange }: {
  primary: Muscle; secondary: Muscle[];
  onChange: (primary: Muscle, secondary: Muscle[]) => void;
}) {
  const [mode, setMode] = useState<Mode>('primary');
  const [query, setQuery] = useState('');
  const secondaryColor = mixHex(colors.accent, colors.bg, 0.3);

  const tap = (m: Muscle) => {
    if (mode === 'primary') onChange(m, secondary.filter((x) => x !== m));
    else if (m !== primary) onChange(primary, secondary.includes(m) ? secondary.filter((x) => x !== m) : [...secondary, m]);
  };
  const q = query.trim().toLowerCase();
  const match = (m: Muscle) => !q || MUSCLE_LABEL[m].toLowerCase().includes(q) || groupOf(m).toLowerCase().includes(q);

  return (
    <View style={{ gap: 12 }}>
      {/* Summary */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 6 }}>
        <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>PRIMARY</Text>
        <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>{MUSCLE_LABEL[primary]} <Text style={{ color: colors.textDim, fontWeight: '500', fontSize: 13 }}>· {groupOf(primary)}</Text></Text>
        <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 }}>SECONDARY</Text>
        <Text style={{ color: secondary.length ? colors.text : colors.textDim }}>
          {secondary.length ? secondary.map((m) => MUSCLE_LABEL[m]).join(', ') : 'None'}
        </Text>
      </View>

      <Segmented options={[{ label: 'Choose primary', value: 'primary' }, { label: 'Add secondary', value: 'secondary' }]} value={mode} onChange={setMode} />

      <BodyMap height={260} onPressMuscle={tap}
        colorFor={(m) => (m === primary ? colors.accent : secondary.includes(m) ? secondaryColor : null)} />
      <Text style={[styles.dim, { fontSize: 12, textAlign: 'center' }]}>
        {mode === 'primary' ? 'Tap the main muscle on the body or in the list' : 'Tap muscles that also work; tap again to remove'}
      </Text>

      <TextInput value={query} onChangeText={setQuery} placeholder="Search muscles" placeholderTextColor={colors.textDim} style={inputStyle} />

      {MUSCLE_REGIONS.map((r) => {
        const groups = r.groups.map((g) => [g, MUSCLE_GROUPS[g].filter(match)] as const).filter(([, l]) => l.length);
        if (!groups.length) return null;
        return (
          <View key={r.label} style={{ gap: 10 }}>
            <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>{r.label.toUpperCase()}</Text>
            {groups.map(([g, list]) => (
              <View key={g} style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{g}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {list.map((m) => {
                    const isP = m === primary;
                    const isS = secondary.includes(m);
                    return (
                      <Pressable key={m} onPress={() => tap(m)} disabled={mode === 'secondary' && isP}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5,
                          borderColor: isP || isS ? colors.accent : colors.border,
                          backgroundColor: isP ? colors.accent : isS ? colors.accentDim : colors.surfaceAlt,
                          opacity: mode === 'secondary' && isP ? 0.6 : 1,
                        }}>
                        <Text style={{ color: isP ? '#06121F' : isS ? colors.accent : colors.text, fontWeight: isP || isS ? '800' : '600', fontSize: 14 }}>
                          {isP ? '● ' : isS ? '○ ' : ''}{MUSCLE_LABEL[m]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
