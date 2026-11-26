import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useProfile } from '../../components/ProfileContext';
import { Card, styles } from '../../components/ui';
import { formatWeight } from '../../domain/units';
import { formatDuration } from '../../domain/workout';
import { listHistory, type WorkoutSummary } from '../../repo/workouts';
import { colors } from '../../theme/colors';

export default function History() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [items, setItems] = useState<WorkoutSummary[]>([]);
  useFocusEffect(useCallback(() => { listHistory(db).then(setItems); }, [db]));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(w) => w.id}
      ListHeaderComponent={<Stack.Screen options={{ title: 'History' }} />}
      ListEmptyComponent={<Text style={styles.dim}>No finished workouts yet.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}>
          <Card style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.text, { fontWeight: '700' }]}>{item.name}</Text>
              <Text style={styles.dim}>
                {new Date(item.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <Text style={{ color: colors.accent }}>
              {item.endedAt ? formatDuration(item.endedAt - item.startedAt) : ''} · {formatWeight(item.volumeKg, profile.unit)} · {item.setCount} sets
            </Text>
            <Text style={styles.dim} numberOfLines={2}>{item.exerciseNames.join(' · ')}</Text>
          </Card>
        </Pressable>
      )}
    />
  );
}
