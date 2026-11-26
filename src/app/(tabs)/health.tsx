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
import { WeightCard } from '../../components/widgets/WeightCard';
import { MEASUREMENTS, METRICS, VITALS } from '../../data/metrics';
import { formatBodyweight as formatWeight } from '../../domain/units';
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
            { id: 'sleep', title: 'Sleep', render: () => <SleepCard /> },
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

function WeightHistory() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [bw] = useLoad(() => listBodyweight(db, 365), [db]);
  if (!bw?.length) return null;
  const rows = [...bw].reverse();
  return (
    <>
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
