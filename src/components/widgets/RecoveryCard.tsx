import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { recoveryScore } from '../../domain/sleep';
import { localDate } from '../../domain/meals';
import { metricHistory } from '../../repo/health';
import { colors } from '../../theme/colors';
import { styles } from '../ui';
import { Bar, useLoad, WidgetCard } from './common';

const color = (s: number) => (s >= 75 ? colors.success : s >= 50 ? '#F5B400' : colors.danger);

/** Today's recovery from sleep score, HRV and resting HR vs your last 14 days. */
export function RecoveryCard() {
  const db = useSQLiteContext();
  const [open, setOpen] = useState(false);
  const [r] = useLoad(async () => {
    const today = localDate();
    const split = async (type: 'hrv' | 'rhr' | 'sleep_score') => {
      const h = await metricHistory(db, type, 15);
      const t = h.find((p) => p.date === today);
      return { today: t?.value ?? null, base: h.filter((p) => p.date !== today).slice(-14).map((p) => p.value) };
    };
    const [hrv, rhr, sleep] = await Promise.all([split('hrv'), split('rhr'), split('sleep_score')]);
    return recoveryScore({ sleepScore: sleep.today, hrv: hrv.today, hrvBaseline: hrv.base, rhr: rhr.today, rhrBaseline: rhr.base });
  }, [db]);

  return (
    <WidgetCard title="Recovery">
      {!r ? (
        <Text style={styles.dim}>Needs today’s sleep score, HRV or resting heart rate (synced from Health Connect, plus a few days of history).</Text>
      ) : (
        <Pressable onPress={() => setOpen((o) => !o)} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <Text style={{ color: color(r.score), fontSize: 32, fontWeight: '900' }}>{r.score}</Text>
            <Text style={[styles.text, { flex: 1, paddingBottom: 6 }]}>{r.advice}</Text>
          </View>
          <Bar value={r.score / 100} color={color(r.score)} />
          {open ? r.parts.map((p) => (
            <View key={p.key} style={{ gap: 2 }}>
              <Text style={styles.text}>{p.label} <Text style={styles.dim}>{p.points}/{p.max} · {p.detail}</Text></Text>
            </View>
          )) : <Text style={[styles.dim, { fontSize: 12 }]}>Tap for details</Text>}
        </Pressable>
      )}
    </WidgetCard>
  );
}
