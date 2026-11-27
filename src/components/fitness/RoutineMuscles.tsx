import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MUSCLE_REGIONS, MUSCLES, MUSCLE_LABEL, type Muscle } from '../../data/muscles';
import { mixHex, volumeBreakdown, weeklyVolume } from '../../domain/volume';
import type { Routine } from '../../repo/routines';
import { colors } from '../../theme/colors';
import { BodyMap } from '../BodyMap';
import { styles } from '../ui';

const LOW = '#1F4E7A';
const HIGH = '#7CC4FF';

/** Color for a muscle by its share of the most-trained muscle's volume (null = not trained). */
export function heatColor(sets: number, max: number): string | null {
  if (sets <= 0 || max <= 0) return null;
  return mixHex(LOW, HIGH, 0.25 + 0.75 * (sets / max));
}

/** Body map with only this routine's trained muscles highlighted. */
export function RoutineBody({ workouts, height = 180, showLabels = false }: { workouts: Routine[]; height?: number; showLabels?: boolean }) {
  const vol = weeklyVolume(workouts);
  const max = Math.max(...Object.values(vol));
  return <BodyMap height={height} showLabels={showLabels} colorFor={(m) => heatColor(vol[m], max)} />;
}

/**
 * Planned sets per week per muscle, split into upper and lower body, most trained
 * first. Tap a row (anywhere) to see which exercises count.
 */
export function VolumeList({ workouts }: { workouts: Routine[] }) {
  const [open, setOpen] = useState<Muscle | null>(null);
  const vol = weeklyVolume(workouts);
  const max = Math.max(1, ...Object.values(vol));
  const fmt = (n: number) => Math.round(n * 10) / 10;
  const untrained = MUSCLES.filter((m) => !vol[m]);
  return (
    <View style={{ gap: 14 }}>
      {MUSCLE_REGIONS.map((r) => {
        const rows = r.muscles.filter((m) => vol[m] > 0).sort((a, b) => vol[b] - vol[a]);
        const total = rows.reduce((a, m) => a + vol[m], 0);
        return (
          <View key={r.label} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>{r.label.toUpperCase()}</Text>
              <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '700' }}>{fmt(total)} sets</Text>
            </View>
            {rows.length === 0 && <Text style={styles.dim}>Nothing planned</Text>}
            {rows.map((m) => {
              const sets = vol[m];
              const isOpen = open === m;
              return (
                <View key={m} style={{ borderRadius: 10, backgroundColor: isOpen ? colors.surfaceAlt : 'transparent' }}>
                  <Pressable onPress={() => setOpen(isOpen ? null : m)} hitSlop={4}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6 }}>
                    <Text style={[styles.text, { width: 116, fontSize: 14 }]} numberOfLines={1}>{MUSCLE_LABEL[m]}</Text>
                    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                      <View style={{ width: `${(sets / max) * 100}%`, height: '100%', backgroundColor: heatColor(sets, max) ?? 'transparent' }} />
                    </View>
                    <Text style={{ width: 34, textAlign: 'right', color: colors.text, fontVariant: ['tabular-nums'], fontWeight: '700' }}>{fmt(sets)}</Text>
                    <Text style={{ color: colors.textDim, fontSize: 14, width: 14, textAlign: 'center' }}>{isOpen ? '▴' : '▾'}</Text>
                  </Pressable>
                  {isOpen && (
                    <View style={{ marginLeft: 12, marginRight: 8, marginBottom: 8, gap: 4, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 10 }}>
                      {volumeBreakdown(workouts, m).map((s, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                          <Text style={[styles.text, { flex: 1, fontSize: 13 }]} numberOfLines={1}>
                            {s.exercise}<Text style={styles.dim}> · {s.workout}{s.secondary ? ' · secondary (½)' : ''}{s.times > 1 ? ` · ${s.times}×/wk` : ''}</Text>
                          </Text>
                          <Text style={{ color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] }}>{fmt(s.sets)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
      {untrained.length > 0 && <Text style={[styles.dim, { fontSize: 13 }]}>Not trained: {untrained.map((m) => MUSCLE_LABEL[m]).join(', ')}</Text>}
      <Text style={[styles.dim, { fontSize: 12 }]}>Working sets per week. Tap a row to see which exercises count. A workout counts once per assigned day; secondary muscles count as half a set.</Text>
    </View>
  );
}
