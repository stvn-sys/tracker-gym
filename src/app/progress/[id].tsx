import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from '../../components/LineChart';
import { useProfile } from '../../components/ProfileContext';
import { TierBadge } from '../../components/TierBadge';
import { Button, Card, SectionTitle, styles } from '../../components/ui';
import { exercisePercentile, percentileToRank, standardFor, TIER_COLORS, type Rank } from '../../domain/ranking';
import { formatWeight, toDisplay } from '../../domain/units';
import { latestBodyweightKg } from '../../repo/bodyweight';
import { getExercise, type Exercise } from '../../repo/exercises';
import { e1rmHistory } from '../../repo/stats';
import { colors } from '../../theme/colors';

export default function ExerciseProgress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [points, setPoints] = useState<{ t: number; e1rm: number }[]>([]);
  const [bw, setBw] = useState<number | null>(null);

  useEffect(() => {
    getExercise(db, id).then(setExercise);
    latestBodyweightKg(db).then(async (kg) => {
      setBw(kg);
      setPoints(await e1rmHistory(db, id, kg));
    });
  }, [db, id]);

  if (!exercise) return <View style={styles.screen} />;
  const std = standardFor(exercise.builtinKey);
  const best = points.reduce((m, p) => Math.max(m, p.e1rm), 0);
  const latest = points[points.length - 1];
  let rank: Rank | null = null;
  if (std && latest && bw && profile.gender) {
    rank = percentileToRank(exercisePercentile(std, latest.e1rm, { sex: profile.gender, age: profile.age, bodyweightKg: bw }));
  }
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

      <SectionTitle>Estimated 1RM over time</SectionTitle>
      <Card>
        {points.length === 0 ? (
          <Text style={styles.dim}>No completed sets yet.</Text>
        ) : (
          <LineChart
            detailed
            height={200}
            points={points.map((p) => ({ x: p.t, y: toDisplay(p.e1rm, profile.unit) }))}
            formatY={(v) => String(Math.round(v))}
            formatX={fmtDate}
          />
        )}
      </Card>

      {[...points].reverse().slice(0, 12).map((p) => (
        <View key={p.t} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
          <Text style={styles.dim}>{fmtDate(p.t)}</Text>
          <Text style={styles.text}>{formatWeight(p.e1rm, profile.unit)}</Text>
        </View>
      ))}

      <View style={{ marginTop: 12 }}>
        <Button label="Edit exercise" variant="ghost" onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })} />
      </View>
    </ScrollView>
  );
}
