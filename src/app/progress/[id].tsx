import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Segmented } from '../../components/SettingsUI';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from '../../components/LineChart';
import { useProfile } from '../../components/ProfileContext';
import { TierBadge } from '../../components/TierBadge';
import { Button, Card, SectionTitle, styles } from '../../components/ui';
import { exercisePercentile, percentileToRank, standardFor, tierTargets, TIER_COLORS, type Rank } from '../../domain/ranking';
import { formatBodyweight, formatWeight, toDisplay } from '../../domain/units';
import { latestBodyweightKg } from '../../repo/bodyweight';
import { getExercise, type Exercise } from '../../repo/exercises';
import { exerciseSessions, type SessionStat } from '../../repo/stats';
import { colors } from '../../theme/colors';

type Metric = 'e1rm' | 'topKg' | 'volumeKg' | 'bestReps';
const METRICS: { key: Metric; short: string; label: string }[] = [
  { key: 'e1rm', short: '1RM', label: 'Estimated 1RM (best set, Epley)' },
  { key: 'topKg', short: 'Top set', label: 'Heaviest working set' },
  { key: 'volumeKg', short: 'Volume', label: 'Total volume (weight × reps)' },
  { key: 'bestReps', short: 'Reps', label: 'Most reps in one set' },
];

export default function ExerciseProgress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [points, setPoints] = useState<SessionStat[]>([]);
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [bw, setBw] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    getExercise(db, id).then(setExercise);
    latestBodyweightKg(db).then(async (kg) => {
      setBw(kg);
      setPoints(await exerciseSessions(db, id, kg));
    });
  }, [db, id]));

  if (!exercise) return <View style={styles.screen} />;
  const std = standardFor(exercise.builtinKey);
  const best = points.reduce((m, p) => Math.max(m, p.e1rm), 0);
  const latest = points[points.length - 1];
  let rank: Rank | null = null;
  if (std && latest && bw && profile.gender) {
    rank = percentileToRank(exercisePercentile(std, latest.e1rm, { sex: profile.gender, age: profile.age, bodyweightKg: bw }));
  }
  const m = METRICS.find((x) => x.key === metric)!;
  const isWeight = metric !== 'bestReps';
  const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: exercise.name }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <TierBadge rank={rank} size={48} />
          <Text style={{ color: rank ? TIER_COLORS[rank.tier] : colors.textDim, fontWeight: '800' }}>
            {rank ? rank.label : std ? 'Not enough data' : 'Unranked'}
          </Text>
          {rank && <Text style={styles.dim}>Top {Math.max(0.1, Math.round((100 - rank.percentile) * 10) / 10)}%</Text>}
        </Card>
        <Card style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
          <Text style={styles.dim}>Latest e1RM</Text>
          <Text style={[styles.text, { fontSize: 22, fontWeight: '800' }]}>{latest ? formatWeight(latest.e1rm, profile.unit) : '–'}</Text>
          <Text style={styles.dim}>Best {best ? formatWeight(best, profile.unit) : '–'}</Text>
        </Card>
      </View>
      {!std && <Text style={styles.dim}>This exercise has no strength standard, so it is unranked. You can add one in src/data/strengthStandards.ts.</Text>}

      {exercise.notes && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.accent, gap: 2 }}>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>EXERCISE NOTES</Text>
          <Text style={styles.text}>{exercise.notes}</Text>
        </Card>
      )}

      {std && bw && profile.gender ? (
        <>
          <SectionTitle>e1RM per rank</SectionTitle>
          <Card style={{ gap: 0, paddingVertical: 6 }}>
            {tierTargets(std, { sex: profile.gender, age: profile.age, bodyweightKg: bw }).map((t, i) => {
              const bodyLoad = !!std.addBodyweight || exercise.equipment === 'bodyweight';
              const extra = t.loadKg - bw;
              const reached = latest ? latest.e1rm >= t.loadKg : false;
              return (
                <View key={t.tier} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TIER_COLORS[t.tier] }} />
                  <Text style={{ color: TIER_COLORS[t.tier], fontWeight: '800', flex: 1 }}>{t.tier}</Text>
                  <Text style={[styles.text, { fontVariant: ['tabular-nums'] }]}>
                    {bodyLoad
                      ? (extra >= 0 ? `BW + ${formatWeight(extra, profile.unit)}` : `BW − ${formatWeight(-extra, profile.unit)}`)
                      : formatWeight(t.loadKg, profile.unit)}
                  </Text>
                  <Text style={{ width: 22, textAlign: 'right', color: reached ? colors.success : colors.border }}>{reached ? '✓' : '·'}</Text>
                </View>
              );
            })}
          </Card>
          <Text style={[styles.dim, { fontSize: 12 }]}>
            Estimated 1RM to reach each rank at {formatBodyweight(bw, profile.unit)}{profile.age ? `, age ${profile.age}` : ''}. Values marked “estimated” in the standards file are educated guesses.
          </Text>
        </>
      ) : std ? (
        <Text style={styles.dim}>Set your gender and weight in Settings › This phone to see the e1RM needed for each rank.</Text>
      ) : null}

      <SectionTitle>Progress over time</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Segmented options={METRICS.map((m) => ({ label: m.short, value: m.key }))} value={metric} onChange={setMetric} />
        {points.length === 0 ? (
          <Text style={styles.dim}>No finished sessions with this exercise yet.</Text>
        ) : (
          <>
            <Text style={styles.dim}>{m.label}{isWeight ? ` (${profile.unit})` : ''}</Text>
            <LineChart
              detailed
              height={200}
              points={points.map((p) => ({ x: p.t, y: isWeight ? toDisplay(p[metric], profile.unit) : p[metric] }))}
              formatY={(v) => String(Math.round(v))}
              formatX={fmtDate}
            />
          </>
        )}
      </Card>

      {points.length > 0 && <SectionTitle>Sessions</SectionTitle>}
      {[...points].reverse().slice(0, 20).map((p) => (
        <View key={p.t} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}>
          <Text style={[styles.dim, { width: 64 }]}>{fmtDate(p.t)}</Text>
          <Text style={[styles.text, { flex: 1, fontSize: 14 }]}>Top {formatWeight(p.topKg, profile.unit)} · {p.bestReps} reps</Text>
          <Text style={[styles.dim, { fontSize: 13 }]}>e1RM {formatWeight(p.e1rm, profile.unit, false)}</Text>
        </View>
      ))}

      <View style={{ marginTop: 12 }}>
        <Button label="Edit exercise" variant="ghost" onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })} />
      </View>
    </ScrollView>
  );
}
