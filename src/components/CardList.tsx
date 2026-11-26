import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { mergeOrder } from '../domain/meals';
import { getJSON, setJSON } from '../repo/kv';
import { colors } from '../theme/colors';
import { styles } from './ui';

export interface CardDef { id: string; title: string; render: () => ReactNode }

interface Layout { order: string[]; hidden: string[]; half?: string[] }

/**
 * A page made of cards the user can reorder and hide ("Edit layout").
 * The layout is saved per page in settings under `layout.<page>`.
 */
export function CardList({ page, cards }: { page: string; cards: CardDef[] }) {
  const db = useSQLiteContext();
  const defaults = cards.map((c) => c.id);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getJSON<Layout | null>(db, `layout.${page}`, null).then((l) => setLayout(l ?? { order: [], hidden: [] }));
  }, [db, page]);

  if (!layout) return null;
  const order = mergeOrder(layout.order, defaults);
  const byId = new Map(cards.map((c) => [c.id, c]));

  const save = (next: Layout) => { setLayout(next); setJSON(db, `layout.${page}`, next); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    save({ ...layout, order: next });
  };
  const toggle = (id: string) => save({
    ...layout, order,
    hidden: layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id],
  });

  const half = layout.half ?? [];
  const toggleHalf = (id: string) => save({ ...layout, order, half: half.includes(id) ? half.filter((h) => h !== id) : [...half, id] });
  // Consecutive half-width cards share a row, two at a time.
  const rows: string[][] = [];
  for (const id of order.filter((x) => !layout.hidden.includes(x))) {
    const last = rows[rows.length - 1];
    if (half.includes(id) && last && last.length === 1 && half.includes(last[0])) last.push(id);
    else rows.push([id]);
  }

  return (
    <View style={{ gap: 12 }}>
      {editing ? (
        order.map((id, i) => {
          const hidden = layout.hidden.includes(id);
          return (
            <View key={id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, opacity: hidden ? 0.5 : 1 }]}>
              <Text style={[styles.text, { flex: 1, fontWeight: '700' }]}>{byId.get(id)?.title}</Text>
              <Small label={half.includes(id) ? '½' : 'Full'} onPress={() => toggleHalf(id)} />
              <Small label={hidden ? 'Show' : 'Hide'} onPress={() => toggle(id)} />
              <Small label="▲" onPress={() => move(i, -1)} disabled={i === 0} />
              <Small label="▼" onPress={() => move(i, 1)} disabled={i === order.length - 1} />
            </View>
          );
        })
      ) : (
        rows.map((r) => r.length === 1 && !half.includes(r[0])
          ? <View key={r[0]}>{byId.get(r[0])?.render()}</View>
          : (
            <View key={r.join()} style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
              {r.map((id) => <View key={id} style={{ flex: 1, minWidth: 0 }}>{byId.get(id)?.render()}</View>)}
              {r.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))
      )}
      <Pressable onPress={() => setEditing((e) => !e)} style={{ alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ color: editing ? colors.accent : colors.textDim, fontWeight: editing ? '800' : '500' }}>
          {editing ? 'Done' : 'Edit layout'}
        </Text>
      </Pressable>
    </View>
  );
}

function Small({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6}
      style={{ minWidth: 36, height: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
