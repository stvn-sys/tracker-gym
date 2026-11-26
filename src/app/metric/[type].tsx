import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from '../../components/LineChart';
import { usePrefs } from '../../components/Prefs';
import { SwipeRow } from '../../components/SwipeRow';
import { Card, SectionTitle, styles } from '../../components/ui';
import { prettyDate } from '../../components/widgets/common';
import { formatMetric, METRICS, type MetricType } from '../../data/metrics';
import { deleteMetric, metricHistory, type MetricPoint } from '../../repo/health';
import { colors } from '../../theme/colors';

/** Full history of one metric or body measurement. */
export default function MetricHistory() {
  const { type } = useLocalSearchParams<{ type: MetricType }>();
  const db = useSQLiteContext();
  const { prefs } = usePrefs();
  const m = METRICS[type];
  const [points, setPoints] = useState<MetricPoint[]>([]);
  useFocusEffect(useCallback(() => { metricHistory(db, type, 5000).then(setPoints); }, [db, type]));
  if (!m) return <View style={styles.screen} />;

  const inches = m.unit === 'cm' && prefs.lengthUnit === 'in';
  const unit = inches ? 'in' : m.unit;
  const show = (v: number) => (inches ? v / 2.54 : v);
  const fmt = (v: number) => (inches ? show(v).toFixed(1) : formatMetric(type, v));
  const toMs = (iso: string) => { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d).getTime(); };
  const first = points[0];
  const last = points[points.length - 1];
  const rows = [...points].reverse();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: m.label }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Now" value={last ? `${fmt(last.value)} ${unit}` : '–'} />
        <Stat label="First" value={first ? `${fmt(first.value)} ${unit}` : '–'} />
        <Stat label="Change" value={first && last && points.length > 1 ? `${last.value >= first.value ? '+' : '−'}${fmt(Math.abs(last.value - first.value))} ${unit}` : '–'} />
      </View>
      <Card>
        {points.length < 2 ? (
          <Text style={styles.dim}>Log at least two days to see a graph.</Text>
        ) : (
          <LineChart detailed height={200} points={points.map((p) => ({ x: toMs(p.date), y: show(p.value) }))}
            formatY={(v) => (Math.round(v * 10) / 10).toString()}
            formatX={(t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
        )}
      </Card>
      <SectionTitle>History</SectionTitle>
      {rows.length === 0 && <Text style={styles.dim}>Nothing logged yet.</Text>}
      {rows.map((p, i) => {
        const prev = rows[i + 1];
        const d = prev ? p.value - prev.value : null;
        return (
          <SwipeRow key={p.date} onDelete={async () => { await deleteMetric(db, type, p.date); setPoints((l) => l.filter((x) => x.date !== p.date)); }}>
            <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[styles.dim, { flex: 1 }]}>{prettyDate(p.date)}</Text>
              <Text style={[styles.text, { width: 110, textAlign: 'right' }]}>{fmt(p.value)} {unit}</Text>
              <Text style={{ width: 70, textAlign: 'right', color: d == null || d === 0 ? colors.textDim : colors.accent }}>
                {d == null ? '' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`}
              </Text>
            </View>
          </SwipeRow>
        );
      })}
      {rows.length > 0 && <Text style={[styles.dim, { textAlign: 'center', fontSize: 12 }]}>Swipe an entry left to delete it</Text>}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={[styles.text, { fontWeight: '800' }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Card>
  );
}
