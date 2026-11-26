import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { formatWeight } from '../../domain/units';
import { formatDuration } from '../../domain/workout';
import { listHistory, type WorkoutSummary } from '../../repo/workouts';
import { colors } from '../../theme/colors';
import { useProfile } from '../ProfileContext';
import { Card, inputStyle, styles } from '../ui';

const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** All finished workouts. Search matches exercise names, workout names and dates (e.g. "squat", "nov", "2026-11-26"). */
export function LogView() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [items, setItems] = useState<WorkoutSummary[]>([]);
  const [query, setQuery] = useState('');
  useFocusEffect(useCallback(() => { listHistory(db).then(setItems); }, [db]));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((w) => {
      const d = new Date(w.startedAt);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hay = [w.name, ...w.exerciseNames, dateLabel(w.startedAt), iso, d.toLocaleDateString()].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <View style={{ gap: 12 }}>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search exercise or date"
        placeholderTextColor={colors.textDim} style={inputStyle} />
      <Text style={styles.dim}>{visible.length} workouts</Text>
      {visible.length === 0 && <Text style={styles.dim}>{items.length ? 'No matches.' : 'No finished workouts yet.'}</Text>}
      {visible.map((item) => (
        <Pressable key={item.id} onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}>
          <Card style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.text, { fontWeight: '700' }]}>{item.name}</Text>
              <Text style={styles.dim}>{dateLabel(item.startedAt)}</Text>
            </View>
            <Text style={{ color: colors.accent }}>
              {item.endedAt ? formatDuration(item.endedAt - item.startedAt) : ''} · {formatWeight(item.volumeKg, profile.unit)} · {item.setCount} sets
            </Text>
            <Text style={styles.dim} numberOfLines={2}>{item.exerciseNames.join(' · ')}</Text>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
