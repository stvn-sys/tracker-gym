import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MUSCLES, MUSCLE_LABEL, type Muscle } from '../../data/muscles';
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

/** Planned sets per week for each muscle, most trained first. Tap a muscle to see which exercises count. */
export function VolumeList({ workouts }: { workouts: Routine[] }) {
  const [open, setOpen] = useState<Muscle | null>(null);
  const vol = weeklyVolume(workouts);
  const max = Math.max(1, ...Object.values(vol));
  const rows = MUSCLES.map((m) => [m, vol[m]] as [Muscle, number]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const untrained = MUSCLES.filter((m) => !vol[m]);
  const fmt = (n: number) => Math.round(n * 10) / 10;
  return (
    <View style={{ gap: 8 }}>
      {rows.map(([m, sets]) => (
        <View key={m}>
          <Pressable onPress={() => setOpen(open === m ? null : m)} disabled={!sets} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
            <Text style={[styles.text, { width: 120, fontSize: 14, color: sets ? colors.text : colors.textDim }]} numberOfLines={1}>
              {sets ? (open === m ? '▾ ' : '▸ ') : '   '}{MUSCLE_LABEL[m]}
            </Text>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${(sets / max) * 100}%`, height: '100%', backgroundColor: heatColor(sets, max) ?? 'transparent' }} />
            </View>
            <Text style={{ width: 40, textAlign: 'right', color: sets ? colors.text : colors.textDim, fontVariant: ['tabular-nums'], fontWeight: '700' }}>{fmt(sets)}</Text>
          </Pressable>
          {open === m && (
            <View style={{ marginLeft: 16, marginTop: 4, marginBottom: 6, gap: 4, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 10 }}>
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
      ))}
      {untrained.length > 0 && <Text style={[styles.dim, { fontSize: 13 }]}>Not trained: {untrained.map((m) => MUSCLE_LABEL[m]).join(', ')}</Text>}
      <Text style={[styles.dim, { fontSize: 12 }]}>Working sets per week. Tap a muscle to see which exercises count. A workout counts once per assigned day; secondary muscles count as half a set.</Text>
    </View>
  );
}
