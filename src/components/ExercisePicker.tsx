import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  DEFAULT_ADDON_PLATES_KG, DEFAULT_INCREMENT_KG, EQUIPMENT, EQUIPMENT_LABEL, equipmentDetail,
  supportsAttachment, supportsBarType, supportsLaterality, type Equipment,
} from '../data/equipment';
import { MUSCLES, MUSCLE_LABEL, type Muscle } from '../data/muscles';
import { listBrands, type Brand } from '../repo/brands';
import { createExercise, getExercise, listExercises, type Exercise } from '../repo/exercises';
import { colors } from '../theme/colors';
import { Button, Chip, ChipRow, inputStyle, styles } from './ui';

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
          <QuickCreate
            initialName={query}
            initialEquipment={equipment}
            onCreated={async (id) => {
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

/** Minimal create form; everything else can be changed later via Edit exercise. */
function QuickCreate({ initialName, initialEquipment, onCreated }: { initialName: string; initialEquipment: Equipment | null; onCreated: (id: string) => void }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(initialName);
  const [equipment, setEquipment] = useState<Equipment>(initialEquipment ?? 'dumbbell');
  const [muscle, setMuscle] = useState<Muscle>('chest');
  const [error, setError] = useState('');

  const create = async () => {
    if (!name.trim()) { setError('Give the exercise a name.'); return; }
    const id = await createExercise(db, {
      name, primaryMuscle: muscle, secondaryMuscles: [], equipment,
      incrementKg: DEFAULT_INCREMENT_KG[equipment], addonPlatesKg: DEFAULT_ADDON_PLATES_KG[equipment] ?? [],
      laterality: supportsLaterality(equipment) ? 'bilateral' : null,
      attachment: null, pulleys: supportsAttachment(equipment) ? 1 : null,
      barType: supportsBarType(equipment) ? 'Olympic barbell' : null,
      restSeconds: null, brandId: null, seriesId: null,
    });
    onCreated(id);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <TextInput value={name} onChangeText={(t) => { setName(t); setError(''); }} placeholder="Exercise name" placeholderTextColor={colors.textDim}
        autoFocus style={[inputStyle, { fontSize: 18, fontWeight: '700' }]} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Text style={styles.dim}>Equipment</Text>
      <ChipRow wrap>
        {EQUIPMENT.map((e) => <Chip key={e} label={EQUIPMENT_LABEL[e]} active={equipment === e} onPress={() => setEquipment(e)} />)}
      </ChipRow>
      <Text style={styles.dim}>Main muscle</Text>
      <ChipRow wrap>
        {MUSCLES.map((m) => <Chip key={m} label={MUSCLE_LABEL[m]} active={muscle === m} onPress={() => setMuscle(m)} />)}
      </ChipRow>
      <Text style={[styles.dim, { fontSize: 13 }]}>Bar type, pulleys, brand, rest time and the rest can be set later with Edit exercise.</Text>
      <Button label="Create and add" onPress={create} />
    </ScrollView>
  );
}
