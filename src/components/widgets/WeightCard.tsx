import { useState } from 'react';
import { Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { formatBodyweight as formatWeight, fromDisplay, toDisplay } from '../../domain/units';
import { listBodyweight, logBodyweight } from '../../repo/bodyweight';
import { colors } from '../../theme/colors';
import { EntryModal, num } from '../EntryModal';
import { LineChart } from '../LineChart';
import { useProfile } from '../ProfileContext';
import { BigValue, prettyDate, useLoad, WidgetCard } from './common';

/** Bodyweight with quick add. The latest value feeds the strength rankings. */
export function WeightCard() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const unit = profile.unit;
  const [open, setOpen] = useState(false);
  const [bw, bump] = useLoad(() => listBodyweight(db), [db]);

  const latest = bw?.at(-1);
  const first = bw?.[0];
  const change = latest && first && bw!.length > 1 ? latest.weightKg - first.weightKg : null;

  return (
    <WidgetCard title="Weight" action="+ Log" onAction={() => setOpen(true)}>
      <BigValue
        value={latest ? formatWeight(latest.weightKg, unit, false) : '–'}
        unit={unit}
        sub={latest ? `Last logged ${prettyDate(latest.date)}` : 'Log your weight to unlock rankings'}
      />
      {change != null && (
        <Text style={{ color: colors.textDim }}>
          {change >= 0 ? '+' : '−'}{formatWeight(Math.abs(change), unit)} over the last {bw!.length} entries
        </Text>
      )}
      {bw && bw.length > 1 && <LineChart points={bw.map((b, i) => ({ x: i, y: toDisplay(b.weightKg, unit) }))} height={50} />}
      <EntryModal
        visible={open}
        title="Log today's weight"
        fields={[{ key: 'w', label: `Weight (${unit})`, numeric: true, initial: latest ? formatWeight(latest.weightKg, unit, false) : '' }]}
        onClose={() => setOpen(false)}
        onSave={async (v) => {
          const val = num(v.w);
          if (val == null || val <= 0) return;
          await logBodyweight(db, Math.round(fromDisplay(val, unit) * 100) / 100);
          setOpen(false);
          bump();
        }}
      />
    </WidgetCard>
  );
}
