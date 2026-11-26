import { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Hypnogram, STAGE_COLORS } from '../../components/health/Hypnogram';
import { LineChart } from '../../components/LineChart';
import { Card, SectionTitle, styles } from '../../components/ui';
import { Bar, useLoad } from '../../components/widgets/common';
import { formatSleep } from '../../data/metrics';
import { localDate } from '../../domain/meals';
import { sleepNights } from '../../repo/sleep';
import { colors } from '../../theme/colors';

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const scoreColor = (s: number) => (s >= 80 ? colors.success : s >= 60 ? '#F5B400' : colors.danger);

/** One night in detail: score breakdown, stage timeline, stage minutes, naps, 14-night trend. */
export default function SleepDetail() {
  const params = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [date, setDate] = useState(params.date === 'latest' ? null : params.date);
  const [data] = useLoad(() => sleepNights(db, localDate(new Date(), -60), localDate()), [db]);
  const list = data ?? [];
  const night = list.find((n) => n.wakeDate === date) ?? list.at(-1);
  const idx = night ? list.indexOf(night) : -1;
  const recent = list.slice(-14);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: 'Sleep' }} />
      {!night ? (
        <Text style={styles.dim}>No synced sleep yet. Connect Health Connect in Settings to see sleep stages and the calculated score.</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Nav label="‹" disabled={idx <= 0} onPress={() => setDate(list[idx - 1].wakeDate)} />
            <Text style={[styles.text, { fontWeight: '800', fontSize: 17 }]}>
              {new Date(night.wakeDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
            <Nav label="›" disabled={idx >= list.length - 1} onPress={() => setDate(list[idx + 1].wakeDate)} />
          </View>

          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 24 }}>
              <View>
                <Text style={{ color: scoreColor(night.score), fontSize: 44, fontWeight: '900' }}>{night.score}</Text>
                <Text style={styles.dim}>Sleep score</Text>
              </View>
              <View style={{ gap: 2, paddingBottom: 4 }}>
                <Text style={[styles.text, { fontWeight: '700' }]}>{formatSleep(night.asleepMin)} asleep</Text>
                <Text style={styles.dim}>{time(night.bedtime)} → {time(night.waketime)} · {formatSleep(night.inBedMin)} in bed</Text>
                {night.napMin > 0 && <Text style={styles.dim}>+ {formatSleep(night.napMin)} nap{night.naps.length > 1 ? 's' : ''}</Text>}
              </View>
            </View>
            {night.hasStages && <Hypnogram session={night.session} width={width - 64} />}
            {night.hasStages && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {(['deep', 'light', 'rem', 'awake'] as const).map((k) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: STAGE_COLORS[k] }} />
                    <Text style={styles.text}>{k === 'rem' ? 'REM' : k[0].toUpperCase() + k.slice(1)} {night.stageMin[k]} min</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <SectionTitle>How the score is made</SectionTitle>
          <Card style={{ gap: 12 }}>
            {night.parts.map((p) => (
              <View key={p.key} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.text, { fontWeight: '700' }]}>{p.label}</Text>
                  <Text style={styles.text}>{p.points} / {p.max}</Text>
                </View>
                <Bar value={p.max ? p.points / p.max : 0} height={6} />
                <Text style={[styles.dim, { fontSize: 13 }]}>{p.detail}</Text>
              </View>
            ))}
            {!night.hasStages && <Text style={[styles.dim, { fontSize: 13 }]}>No stage data for this night, so only duration (and bedtime consistency) count.</Text>}
            <Text style={[styles.dim, { fontSize: 12 }]}>Calculated by this app from Health Connect data; it will differ from Fitbit’s own score.</Text>
          </Card>

          {recent.length > 1 && (
            <>
              <SectionTitle>Last {recent.length} nights</SectionTitle>
              <Card style={{ gap: 10 }}>
                <Text style={styles.dim}>Score</Text>
                <LineChart points={recent.map((n, i) => ({ x: i, y: n.score }))} height={70} color={colors.accent} />
                <Text style={styles.dim}>Stages (minutes)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 90 }}>
                  {recent.map((n) => {
                    const max = Math.max(...recent.map((x) => x.inBedMin));
                    const h = (m: number) => (m / max) * 86;
                    return (
                      <Pressable key={n.wakeDate} onPress={() => setDate(n.wakeDate)} style={{ flex: 1, justifyContent: 'flex-end', opacity: n === night ? 1 : 0.75 }}>
                        <View style={{ height: h(n.stageMin.awake), backgroundColor: STAGE_COLORS.awake, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                        <View style={{ height: h(n.stageMin.rem), backgroundColor: STAGE_COLORS.rem }} />
                        <View style={{ height: h(n.hasStages ? n.stageMin.light : n.asleepMin), backgroundColor: STAGE_COLORS.light }} />
                        <View style={{ height: h(n.stageMin.deep), backgroundColor: STAGE_COLORS.deep }} />
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.dim, { fontSize: 12 }]}>
                  Average {formatSleep(Math.round(recent.reduce((a, n) => a + n.asleepMin, 0) / recent.length))} asleep · score {Math.round(recent.reduce((a, n) => a + n.score, 0) / recent.length)}
                </Text>
              </Card>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Nav({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={10}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ color: colors.text, fontSize: 24, marginTop: -3 }}>{label}</Text>
    </Pressable>
  );
}
