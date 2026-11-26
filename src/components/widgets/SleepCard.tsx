import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { formatSleep } from '../../data/metrics';
import { localDate } from '../../domain/meals';
import { logMetric, metricHistory } from '../../repo/health';
import { getGoals } from '../../repo/kv';
import { colors } from '../../theme/colors';
import { EntryModal, num } from '../EntryModal';
import { LineChart } from '../LineChart';
import { styles } from '../ui';
import { Bar, prettyDate, useLoad, WidgetCard } from './common';

const scoreColor = (s: number) => (s >= 80 ? colors.success : s >= 60 ? '#F5B400' : colors.danger);

/** Sleep score + duration. Logged against the date you woke up. */
export function SleepCard() {
  const db = useSQLiteContext();
  const [open, setOpen] = useState(false);
  const [data, bump] = useLoad(async () => ({
    dur: await metricHistory(db, 'sleep_min', 14),
    score: await metricHistory(db, 'sleep_score', 14),
    goals: await getGoals(db),
  }), [db]);

  const dur = data?.dur.at(-1);
  const score = data?.score.at(-1);

  return (
    <WidgetCard title="Sleep" action="+ Log" onAction={() => setOpen(true)}>
      <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-end' }}>
        <View>
          <Text style={{ color: score ? scoreColor(score.value) : colors.text, fontSize: 28, fontWeight: '800' }}>{score ? Math.round(score.value) : '–'}</Text>
          <Text style={styles.dim}>Score</Text>
        </View>
        <View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>{dur ? formatSleep(dur.value) : '–'}</Text>
          <Text style={styles.dim}>Duration{dur ? ` · ${prettyDate(dur.date)}` : ''}</Text>
        </View>
      </View>
      {dur && data && <Bar value={dur.value / data.goals.sleepMin} color={colors.accent} />}
      {data && data.dur.length > 1 && <LineChart points={data.dur.map((p, i) => ({ x: i, y: p.value / 60 }))} height={46} color={colors.accent} />}
      <EntryModal
        visible={open}
        title="Log last night's sleep"
        fields={[
          { key: 'h', label: 'Hours', numeric: true, placeholder: '7' },
          { key: 'm', label: 'Minutes', numeric: true, placeholder: '30' },
          { key: 's', label: 'Sleep score (0–100, optional)', numeric: true },
        ]}
        onClose={() => setOpen(false)}
        onSave={async (v) => {
          const today = localDate();
          const minutes = (num(v.h) ?? 0) * 60 + (num(v.m) ?? 0);
          if (minutes > 0 && minutes <= 1440) await logMetric(db, 'sleep_min', today, minutes);
          const s = num(v.s);
          if (s != null && s >= 0 && s <= 100) await logMetric(db, 'sleep_score', today, s);
          setOpen(false);
          bump();
        }}
      />
    </WidgetCard>
  );
}
