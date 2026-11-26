import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { EQUIPMENT, EQUIPMENT_LABEL, equipmentDetail, type Equipment } from '../data/equipment';
import { MUSCLE_LABEL, type Muscle } from '../data/muscles';
import { listBrands, type Brand } from '../repo/brands';
import { getExercise, listExercises, type Exercise } from '../repo/exercises';
import { ExerciseForm } from './ExerciseForm';
import { colors } from '../theme/colors';
import { Chip, ChipRow, inputStyle, styles } from './ui';

interface Props {
  visible: boolean;
  title: string;
  /** Exercises training this muscle are listed first (used for swaps). */
  preferMuscle?: Muscle;
  excludeId?: string;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

/** Search, filter by equipment, or create a new exercise on the spot. */
export function ExercisePicker({ visible, title, preferMuscle, excludeId, onPick, onClose }: Props) {
  const db = useSQLiteContext();
  const [all, setAll] = useState<Exercise[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    listExercises(db).then(setAll);
    listBrands(db).then(setBrands);
  }, [db, visible]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (e: Exercise) =>
      !preferMuscle ? 0 : e.primaryMuscle === preferMuscle ? 0 : e.secondaryMuscles.includes(preferMuscle) ? 1 : 2;
    return all
      .filter((e) => e.id !== excludeId && (!equipment || e.equipment === equipment)
        && (!q || e.name.toLowerCase().includes(q) || MUSCLE_LABEL[e.primaryMuscle].toLowerCase().includes(q)))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [all, query, preferMuscle, excludeId, equipment]);

  const close = () => { setCreating(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <View style={[styles.screen, { paddingTop: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
          <Text style={[styles.section, { flex: 1, marginTop: 0 }]}>{creating ? 'New exercise' : title}</Text>
          <Pressable onPress={creating ? () => setCreating(false) : close} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 16 }}>{creating ? 'Back' : 'Close'}</Text>
          </Pressable>
        </View>

        {creating ? (
          <ExerciseForm
            id={null}
            initialName={query}
            initialEquipment={equipment}
            onSaved={async (id) => {
              const ex = await getExercise(db, id);
              setCreating(false);
              setQuery('');
              if (ex) onPick(ex);
            }}
          />
        ) : (
          <>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search name or muscle" placeholderTextColor={colors.textDim}
              style={[inputStyle, { marginHorizontal: 16, marginTop: 16 }]} />
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <ChipRow>
                <Chip label="All" active={!equipment} onPress={() => setEquipment(null)} />
                {EQUIPMENT.map((e) => (
                  <Chip key={e} label={EQUIPMENT_LABEL[e]} active={equipment === e} onPress={() => setEquipment(equipment === e ? null : e)} />
                ))}
              </ChipRow>
            </View>
            <FlatList
              data={list}
              keyExtractor={(e) => e.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              ListHeaderComponent={
                <Pressable onPress={() => setCreating(true)}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>
                    + Create {query.trim() ? `“${query.trim()}”` : 'new exercise'}
                  </Text>
                </Pressable>
              }
              ListEmptyComponent={<Text style={[styles.dim, { paddingVertical: 12 }]}>No exercises match. Create it above.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setQuery(''); onPick(item); }}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={styles.text}>{item.name}</Text>
                  <Text style={styles.dim}>{MUSCLE_LABEL[item.primaryMuscle]} · {equipmentDetail(item, brands)}</Text>
                </Pressable>
              )}
            />
          </>
        )}
      </View>
    </Modal>
  );
}
