import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { EQUIPMENT_LABEL } from '../data/equipment';
import { MUSCLE_LABEL, type Muscle } from '../data/muscles';
import { listExercises, type Exercise } from '../repo/exercises';
import { colors } from '../theme/colors';
import { usePrefs } from './Prefs';
import { inputStyle, styles } from './ui';

interface Props {
  visible: boolean;
  title: string;
  /** Exercises training this muscle are listed first (used for swaps). */
  preferMuscle?: Muscle;
  excludeId?: string;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ visible, title, preferMuscle, excludeId, onPick, onClose }: Props) {
  const db = useSQLiteContext();
  const [all, setAll] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const { prefs } = usePrefs();

  useEffect(() => {
    if (visible) listExercises(db).then(setAll);
  }, [db, visible]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (e: Exercise) =>
      !preferMuscle ? 0 : e.primaryMuscle === preferMuscle ? 0 : e.secondaryMuscles.includes(preferMuscle) ? 1 : 2;
    return all
      .filter((e) => e.id !== excludeId && prefs.equipment.includes(e.equipment) && (!q || e.name.toLowerCase().includes(q) || MUSCLE_LABEL[e.primaryMuscle].toLowerCase().includes(q)))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [all, query, preferMuscle, excludeId, prefs.equipment]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.screen, { paddingTop: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
          <Text style={[styles.section, { flex: 1, marginTop: 0 }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 16 }}>Close</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or muscle"
          placeholderTextColor={colors.textDim}
          style={[inputStyle, { margin: 16 }]}
        />
        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setQuery(''); onPick(item); }}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={styles.text}>{item.name}</Text>
              <Text style={styles.dim}>{MUSCLE_LABEL[item.primaryMuscle]} · {EQUIPMENT_LABEL[item.equipment]}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
