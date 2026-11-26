import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../../components/ui';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../data/muscles';
import { listExercises, type Exercise } from '../../repo/exercises';
import { colors } from '../../theme/colors';

export default function Library() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Exercise[]>([]);
  useEffect(() => { listExercises(db).then(setItems); }, [db]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={<Text style={styles.dim}>{items.length} exercises</Text>}
      renderItem={({ item }) => (
        <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={styles.text}>{item.name}</Text>
          <Text style={styles.dim}>
            {MUSCLE_LABEL[item.primaryMuscle]} · {EQUIPMENT_LABEL[item.equipment]}
          </Text>
        </View>
      )}
    />
  );
}
