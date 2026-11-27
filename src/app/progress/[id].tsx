import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Segmented } from '../../components/SettingsUI';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from '../../components/LineChart';
import { useProfile } from '../../components/ProfileContext';
import { Button, Card, SectionTitle, styles } from '../../components/ui';
import { formatWeight, toDisplay } from '../../domain/units';
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

  useFocusEffect(useCallback(() => {
    getExercise(db, id).then(setExercise);
    latestBodyweightKg(db).then(async (kg) => {
      setPoints(await exerciseSessions(db, id, kg));
    });
  }, [db, id]));

  if (!exercise) return <View style={styles.screen} />;
  const best = points.reduce((m, p) => Math.max(m, p.e1rm), 0);
  const latest = points[points.length - 1];
  const m = METRICS.find((x) => x.key === metric)!;
  const isWeight = metric !== 'bestReps';
  const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: exercise.name }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
          <Text style={styles.dim}>Latest e1RM</Text>
          <Text style={[styles.text, { fontSize: 22, fontWeight: '800' }]}>{latest ? formatWeight(latest.e1rm, profile.unit) : '–'}</Text>
          <Text style={styles.dim}>Best {best ? formatWeight(best, profile.unit) : '–'}</Text>
        </Card>
      </View>

      {exercise.notes && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.accent, gap: 2 }}>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>EXERCISE NOTES</Text>
          <Text style={styles.text}>{exercise.notes}</Text>
        </Card>
      )}

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
