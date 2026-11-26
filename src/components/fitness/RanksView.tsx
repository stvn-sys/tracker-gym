import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BodyMap } from '../../components/BodyMap';
import { useProfile } from '../../components/ProfileContext';
import { RadarChart } from '../../components/RadarChart';
import { TierBadge } from '../../components/TierBadge';
import { Card, SectionTitle, styles } from '../../components/ui';
import { MUSCLES, MUSCLE_LABEL, MUSCLE_REGIONS, type Muscle } from '../../data/muscles';
import { percentileToRank, TIER_COLORS, TIERS, UNRANKED_COLOR, type Rank } from '../../domain/ranking';
import { formatWeight } from '../../domain/units';
import { latestBodyweightKg } from '../../repo/bodyweight';
import { computeStats, RECENT_DAYS, type StatsResult } from '../../repo/stats';
import { colors } from '../../theme/colors';

export function RanksView() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [bw, setBw] = useState<number | null | undefined>(undefined);
  const [stats, setStats] = useState<StatsResult | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      const kg = await latestBodyweightKg(db);
      if (cancelled) return;
      setBw(kg);
      if (kg && profile.gender) {
        const s = await computeStats(db, { sex: profile.gender, age: profile.age, bodyweightKg: kg });
        if (!cancelled) setStats(s);
      }
    })();
    return () => { cancelled = true; };
  }, [db, profile.gender, profile.age]));

  if (bw === undefined) return <View style={styles.screen} />;

  if (!bw || !profile.gender) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card style={{ gap: 8 }}>
          <Text style={[styles.text, { fontWeight: '800', fontSize: 18 }]}>Unlock your rankings</Text>
          {!profile.gender && <Text style={styles.dim}>• Set your gender (and age) in Settings.</Text>}
          {!bw && <Text style={styles.dim}>• Log your bodyweight on the Home tab.</Text>}
          <Text style={styles.dim}>Rankings compare your estimated 1RMs with strength standards for your sex, age and bodyweight.</Text>
        </Card>
      </ScrollView>
    );
  }
  if (!stats) return <View style={styles.screen} />;

  const muscleRank = (m: Muscle): Rank | null => (stats.muscles[m] == null ? null : percentileToRank(stats.muscles[m]!));
  const colorFor = (m: Muscle) => { const r = muscleRank(m); return r ? TIER_COLORS[r.tier] : null; };

  const ranked = MUSCLES.filter((m) => stats.muscles[m] != null).map((m) => ({ m, rank: muscleRank(m)! }));
  const strongest = [...ranked].sort((a, b) => b.rank.percentile - a.rank.percentile)[0];
  const weakest = [...ranked].sort((a, b) => a.rank.percentile - b.rank.percentile)[0];
  const closest = [...ranked].filter((x) => x.rank.percentile < 100).sort((a, b) => b.rank.progress - a.rank.progress)[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      {stats.overall ? (
        <Card style={{ alignItems: 'center', gap: 6, borderColor: TIER_COLORS[stats.overall.tier], backgroundColor: TIER_COLORS[stats.overall.tier] + '1F' }}>
          <TierBadge rank={stats.overall} size={84} />
          <Text style={{ color: TIER_COLORS[stats.overall.tier], fontSize: 26, fontWeight: '900', letterSpacing: 1 }}>
            {stats.overall.label.toUpperCase()}
          </Text>
          <Text style={styles.dim}>Stronger than ~{Math.round(stats.overall.percentile)}% of people who train</Text>
        </Card>
      ) : (
        <Card>
          <Text style={styles.text}>No ranked lifts in the last {RECENT_DAYS} days yet.</Text>
          <Text style={styles.dim}>Finish a workout with ranked exercises (squat, bench, deadlift, rows, curls…) to see your ranks.</Text>
        </Card>
      )}

      <SectionTitle>Body map</SectionTitle>
      <Card>
        <BodyMap colorFor={colorFor} height={320} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, justifyContent: 'center' }}>
          {TIERS.map((t) => <Legend key={t} color={TIER_COLORS[t]} label={t} />)}
          <Legend color={UNRANKED_COLOR} label="Unranked" />
        </View>
      </Card>

      <SectionTitle>Muscle groups</SectionTitle>
      <Card>
        <RadarChart axes={stats.groups.map((g) => {
          const r = g.percentile == null ? null : percentileToRank(g.percentile);
          return { label: g.group, value: g.percentile, sublabel: r?.label ?? 'Unranked', color: r ? TIER_COLORS[r.tier] : colors.textDim };
        })} />
      </Card>

      {ranked.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Insight title="Strongest" muscle={strongest.m} rank={strongest.rank} detail={`Top ${top(strongest.rank)}%`} />
          <Insight title="Weakest" muscle={weakest.m} rank={weakest.rank} detail={`Top ${top(weakest.rank)}%`} />
          {closest && <Insight title="Closest to next" muscle={closest.m} rank={closest.rank} detail={`${Math.round(closest.rank.progress * 100)}% to next`} />}
        </View>
      )}

      <SectionTitle>Muscle rankings</SectionTitle>
      {MUSCLE_REGIONS.map((region) => {
        const ranks = region.muscles.map((m) => muscleRank(m)).filter((r): r is Rank => !!r);
        const avg = ranks.length ? percentileToRank(ranks.reduce((a, r) => a + r.percentile, 0) / ranks.length) : null;
        return (
          <Card key={region.label} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.text, { fontWeight: '800', fontSize: 18 }]}>{region.label}</Text>
              <Text style={{ color: avg ? TIER_COLORS[avg.tier] : colors.textDim, fontWeight: '800' }}>{avg ? avg.label : 'Unranked'}</Text>
            </View>
            {region.muscles.map((m) => {
              const r = muscleRank(m);
              return (
                <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 }}>
                  <TierBadge rank={r} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.text}>{MUSCLE_LABEL[m]}</Text>
                    <Text style={{ color: r ? TIER_COLORS[r.tier] : colors.textDim, fontWeight: '700', fontSize: 13 }}>
                      {r ? r.label.toUpperCase() : 'UNRANKED'}
                    </Text>
                  </View>
                  {r && <ProgressBar value={r.progress} color={TIER_COLORS[r.tier]} />}
                </View>
              );
            })}
          </Card>
        );
      })}

      <SectionTitle>Exercise rankings</SectionTitle>
      <Text style={styles.dim}>Best estimated 1RM (Epley) from the last {RECENT_DAYS} days. Tap for the progress graph.</Text>
      {stats.exercises.length === 0 && <Text style={styles.dim}>Nothing ranked yet.</Text>}
      {stats.exercises.map((e) => (
        <Pressable key={e.exerciseId} onPress={() => router.push({ pathname: '/progress/[id]', params: { id: e.exerciseId } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <TierBadge rank={e.rank} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.text, { fontWeight: '700' }]}>{e.exercise.name}</Text>
              <Text style={{ color: TIER_COLORS[e.rank.tier], fontWeight: '700', fontSize: 13 }}>{e.rank.label.toUpperCase()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.text}>{formatWeight(e.e1rmKg, profile.unit)}</Text>
              <Text style={styles.dim}>Top {top(e.rank)}%</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const top = (r: Rank) => Math.max(0.1, Math.round((100 - r.percentile) * 10) / 10);

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 16, height: 5, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: colors.textDim, fontSize: 11, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Insight({ title, muscle, rank, detail }: { title: string; muscle: Muscle; rank: Rank; detail: string }) {
  return (
    <Card style={{ flex: 1, padding: 10, alignItems: 'center', gap: 4 }}>
      <Text style={{ color: colors.textDim, fontSize: 11 }} numberOfLines={1}>{title}</Text>
      <TierBadge rank={rank} size={32} />
      <Text style={[styles.text, { fontWeight: '700', fontSize: 14 }]} numberOfLines={1}>{MUSCLE_LABEL[muscle]}</Text>
      <Text style={{ color: TIER_COLORS[rank.tier], fontSize: 11 }} numberOfLines={1}>{rank.label}</Text>
      <Text style={{ color: colors.textDim, fontSize: 11 }} numberOfLines={1}>{detail}</Text>
    </Card>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ width: 70, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}
