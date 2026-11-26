import { useState } from 'react';
import { View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { formatMetric, METRICS, type MetricType } from '../../data/metrics';
import { localDate } from '../../domain/meals';
import { getGoals } from '../../repo/kv';
import { logMetric, metricHistory } from '../../repo/health';
import { colors } from '../../theme/colors';
import { EntryModal, num } from '../EntryModal';
import { LineChart } from '../LineChart';
import { Bar, BigValue, prettyDate, useLoad, WidgetCard } from './common';

/** Generic card for steps and vitals: latest value, trend line, quick log. */
export function MetricCard({ type }: { type: MetricType }) {
  const db = useSQLiteContext();
  const m = METRICS[type];
  const today = localDate();
  const [open, setOpen] = useState(false);
  const [data, bump] = useLoad(async () => ({
    history: await metricHistory(db, type, 30),
    goals: await getGoals(db),
  }), [db, type]);

  const history = data?.history ?? [];
  const latest = history[history.length - 1];
  const isSteps = type === 'steps';
  const todayVal = isSteps ? (latest?.date === today ? latest.value : 0) : latest?.value;

  return (
    <WidgetCard title={m.label} action="+ Log" onAction={() => setOpen(true)}>
      <BigValue
        value={formatMetric(type, todayVal)}
        unit={m.unit}
        sub={isSteps ? `Goal ${data?.goals.steps.toLocaleString() ?? ''}` : latest ? `Last logged ${prettyDate(latest.date)}` : 'No data yet'}
      />
      {isSteps && data && <Bar value={(todayVal ?? 0) / data.goals.steps} color={colors.success} />}
      {history.length > 1 && (
        <View>
          <LineChart points={history.map((p, i) => ({ x: i, y: p.value }))} height={50} color={isSteps ? colors.success : colors.accent} />
        </View>
      )}
      <EntryModal
        visible={open}
        title={`Log ${m.label.toLowerCase()} (today)`}
        fields={[{ key: 'v', label: `${m.label} (${m.unit})`, numeric: true, initial: latest?.date === today ? String(latest.value) : '' }]}
        onClose={() => setOpen(false)}
        onSave={async (v) => {
          const val = num(v.v);
          if (val == null || val < m.min || val > m.max) return;
          await logMetric(db, type, today, val);
          setOpen(false);
          bump();
        }}
      />
    </WidgetCard>
  );
}
