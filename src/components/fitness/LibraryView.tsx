import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { showAlert } from '../Dialog';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Chip, ChipRow, inputStyle, styles } from '../../components/ui';
import { EQUIPMENT, EQUIPMENT_LABEL, type Equipment } from '../../data/equipment';
import { MUSCLES, MUSCLE_LABEL, type Muscle } from '../../data/muscles';
import { listExercises, restoreDefaultExercises, type Exercise } from '../../repo/exercises';
import { colors } from '../../theme/colors';

type Sort = 'name' | 'muscle' | 'equipment';

export function LibraryView() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [sort, setSort] = useState<Sort>('name');

  const reload = useCallback(() => { listExercises(db).then(setItems); }, [db]);
  useFocusEffect(reload);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((e) =>
      (!q || e.name.toLowerCase().includes(q)) &&
      (!muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)) &&
      (!equipment || e.equipment === equipment));
    const key = (e: Exercise) =>
      sort === 'muscle' ? MUSCLE_LABEL[e.primaryMuscle] : sort === 'equipment' ? EQUIPMENT_LABEL[e.equipment] : '';
    return list.sort((a, b) => key(a).localeCompare(key(b)) || a.name.localeCompare(b.name));
  }, [items, query, muscle, equipment, sort]);

  const restore = () =>
    showAlert('Restore defaults?', 'Premade exercises are reset and deleted ones come back. Your own exercises and history are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => restoreDefaultExercises(db).then(reload) },
    ]);

  return (
    <View style={styles.screen}>
      <View style={{ padding: 16, paddingBottom: 4, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            placeholderTextColor={colors.textDim}
            style={[inputStyle, { flex: 1 }]}
          />
          <Pressable onPress={() => router.push('/exercise/new')} style={addBtn}>
            <Text style={{ color: '#06121F', fontWeight: '800', fontSize: 22 }}>+</Text>
          </Pressable>
        </View>
        <ChipRow>
          <Chip label="All muscles" active={!muscle} onPress={() => setMuscle(null)} />
          {MUSCLES.map((m) => (
            <Chip key={m} label={MUSCLE_LABEL[m]} active={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
          ))}
        </ChipRow>
        <ChipRow>
          <Chip label="All equipment" active={!equipment} onPress={() => setEquipment(null)} />
          {EQUIPMENT.map((e) => (
            <Chip key={e} label={EQUIPMENT_LABEL[e]} active={equipment === e} onPress={() => setEquipment(equipment === e ? null : e)} />
          ))}
        </ChipRow>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.dim}>Sort</Text>
          {(['name', 'muscle', 'equipment'] as Sort[]).map((s) => (
            <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} active={sort === s} onPress={() => setSort(s)} />
          ))}
        </View>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Text style={[styles.dim, { marginVertical: 6 }]}>{visible.length} exercises</Text>}
        ListFooterComponent={
          <Pressable onPress={restore} style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.textDim }}>Restore default exercises</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } })}
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Text style={styles.text}>
              {item.name}
              {!item.builtinKey && <Text style={{ color: colors.accent, fontSize: 12 }}>  CUSTOM</Text>}
            </Text>
            <Text style={styles.dim}>
              {MUSCLE_LABEL[item.primaryMuscle]} · {EQUIPMENT_LABEL[item.equipment]}
              {item.laterality === 'unilateral' ? ' · Unilateral' : ''}
              {item.pulleys ? ` · ${item.pulleys}× pulley` : ''}
              {item.attachment ? ` · ${item.attachment}` : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const addBtn = {
  width: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
} as const;
