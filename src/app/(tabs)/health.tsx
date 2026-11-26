import { ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { CardList } from '../../components/CardList';
import { PhotosView } from '../../components/health/PhotosView';
import { useProfile } from '../../components/ProfileContext';
import { useSubTab } from '../../components/SubTabs';
import { Card, SectionTitle, styles } from '../../components/ui';
import { prettyDate, useLoad } from '../../components/widgets/common';
import { MetricCard } from '../../components/widgets/MetricCard';
import { SleepCard } from '../../components/widgets/SleepCard';
import { RecoveryCard } from '../../components/widgets/RecoveryCard';
import { CardioCard } from '../../components/widgets/CardioCard';
import { WeightCard } from '../../components/widgets/WeightCard';
import { MEASUREMENTS, METRICS, VITALS } from '../../data/metrics';
import { formatBodyweight as formatWeight, toDisplay } from '../../domain/units';
import { LineChart } from '../../components/LineChart';
import { Segmented } from '../../components/SettingsUI';
import { useState } from 'react';
import { listBodyweight } from '../../repo/bodyweight';
import { colors } from '../../theme/colors';

export default function Health() {
  const sub = useSubTab('health');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
      {sub === 'Metrics' && (
        <CardList
          page="health"
          cards={[
            { id: 'steps', title: 'Steps', render: () => <MetricCard type="steps" /> },
            { id: 'recovery', title: 'Recovery', render: () => <RecoveryCard /> },
            { id: 'sleep', title: 'Sleep', render: () => <SleepCard /> },
            { id: 'cardio', title: 'Cardio', render: () => <CardioCard /> },
            { id: 'vitals-title', title: 'Vitals heading', render: () => <Text style={[styles.section, { marginTop: 4 }]}>Vitals</Text> },
            ...VITALS.map((v) => ({ id: v, title: METRICS[v].label, render: () => <MetricCard type={v} /> })),
          ]}
        />
      )}
      {sub === 'Weight' && (
        <>
          <WeightCard />
          <WeightHistory />
        </>
      )}
      {sub === 'Measurements' && (
        <CardList
          page="measurements"
          cards={MEASUREMENTS.map((m) => ({ id: m, title: METRICS[m].label, render: () => <MetricCard type={m} /> }))}
        />
      )}
      {sub === 'Photo Progress' && <PhotosView />}
    </ScrollView>
  );
}

type Range = '1M' | '3M' | '6M' | '1Y' | 'All';
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365, All: 0 };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.textDim, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function WeightHistory() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [bw] = useLoad(() => listBodyweight(db, 5000), [db]);
  const [range, setRange] = useState<Range>('3M');
  const [now] = useState(() => Date.now());
  if (!bw?.length) return null;
  const rows = [...bw].reverse();
  const toMs = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const cutoff = range === 'All' ? 0 : now - RANGE_DAYS[range] * 86_400_000;
  const inRange = bw.filter((e) => toMs(e.date) >= cutoff);
  const first = inRange[0];
  const last = inRange[inRange.length - 1];
  const change = first && last && inRange.length > 1 ? last.weightKg - first.weightKg : null;
  const weeks = first && last ? (toMs(last.date) - toMs(first.date)) / (7 * 86_400_000) : 0;
  const perWeek = change != null && weeks >= 1 ? change / weeks : null;
  const signed = (kg: number) => `${kg > 0 ? '+' : kg < 0 ? '−' : '±'}${formatWeight(Math.abs(kg), profile.unit)}`;
  return (
    <>
      <SectionTitle>Progress</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Segmented options={(Object.keys(RANGE_DAYS) as Range[]).map((r) => ({ label: r, value: r }))} value={range} onChange={setRange} />
        {inRange.length < 2 ? (
          <Text style={styles.dim}>Log your weight on at least two days in this period to see a graph.</Text>
        ) : (
          <LineChart
            detailed
            height={200}
            points={inRange.map((e) => ({ x: toMs(e.date), y: toDisplay(e.weightKg, profile.unit) }))}
            formatY={(v) => (Math.round(v * 10) / 10).toString()}
            formatX={(t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          />
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat label="Start" value={first ? formatWeight(first.weightKg, profile.unit) : '–'} />
          <Stat label="Now" value={last ? formatWeight(last.weightKg, profile.unit) : '–'} />
          <Stat label="Change" value={change != null ? signed(change) : '–'} />
          <Stat label="Per week" value={perWeek != null ? signed(perWeek) : '–'} />
        </View>
      </Card>
      <SectionTitle>History</SectionTitle>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {rows.map((e, i) => {
          const prev = rows[i + 1];
          const d = prev ? e.weightKg - prev.weightKg : null;
          return (
            <View key={e.id} style={{ flexDirection: 'row', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Text style={[styles.dim, { flex: 1 }]}>{prettyDate(e.date)}</Text>
              <Text style={[styles.text, { width: 90, textAlign: 'right', fontVariant: ['tabular-nums'] }]}>{formatWeight(e.weightKg, profile.unit)}</Text>
              <Text style={{ width: 80, textAlign: 'right', color: d == null || Math.abs(d) < 0.05 ? colors.textDim : d > 0 ? colors.accent : colors.success, fontVariant: ['tabular-nums'] }}>
                {d == null ? '' : `${d > 0 ? '+' : '−'}${formatWeight(Math.abs(d), profile.unit, false)}`}
              </Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}
