import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Chip, ChipRow, inputStyle, styles } from '../../components/ui';
import { EQUIPMENT, EQUIPMENT_LABEL, equipmentDetail, type Equipment } from '../../data/equipment';
import { listBrands, type Brand } from '../../repo/brands';
import { allE1rmSeries } from '../../repo/stats';
import { LineChart } from '../LineChart';
import { EquipmentText } from '../EquipmentText';
import { groupOf, MUSCLE_GROUPS, MUSCLE_LABEL } from '../../data/muscles';
import { listExercises, type Exercise } from '../../repo/exercises';
import { colors } from '../../theme/colors';

type Sort = 'name' | 'muscle' | 'equipment';

export function LibraryView() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('name');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [series, setSeries] = useState<Map<string, number[]>>(new Map());
  const reload = useCallback(() => { listExercises(db).then(setItems); listBrands(db).then(setBrands); allE1rmSeries(db).then(setSeries); }, [db]);
  useFocusEffect(reload);

  /** Detail parts after the equipment name, e.g. ['2 pulleys', 'Rope']. */
  const subParts = useCallback((e: Exercise) => equipmentDetail(e, brands).split(' · ').slice(1), [brands]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((e) =>
      (!q || e.name.toLowerCase().includes(q)) &&
      (!muscle || groupOf(e.primaryMuscle) === muscle || e.secondaryMuscles.some((m) => groupOf(m) === muscle)) &&
      (!equipment || e.equipment === equipment) &&
      (!sub || subParts(e).includes(sub)));
    const key = (e: Exercise) =>
      sort === 'muscle' ? `${groupOf(e.primaryMuscle)} ${MUSCLE_LABEL[e.primaryMuscle]}` : sort === 'equipment' ? EQUIPMENT_LABEL[e.equipment] : '';
    return list.sort((a, b) => key(a).localeCompare(key(b)) || a.name.localeCompare(b.name));
  }, [items, query, muscle, equipment, sort, sub, subParts]);

  // Sub-types present for the chosen equipment (e.g. '2 pulleys', 'Matrix Versa', 'EZ bar').
  const subs = equipment ? [...new Set(items.filter((e) => e.equipment === equipment).flatMap(subParts))].sort() : [];

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
          {Object.keys(MUSCLE_GROUPS).map((m) => (
            <Chip key={m} label={m} active={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
          ))}
        </ChipRow>
        <ChipRow>
          <Chip label="All equipment" active={!equipment} onPress={() => { setEquipment(null); setSub(null); }} />
          {EQUIPMENT.map((e) => (
            <Chip key={e} label={EQUIPMENT_LABEL[e]} active={equipment === e} onPress={() => { setEquipment(equipment === e ? null : e); setSub(null); }} />
          ))}
        </ChipRow>
        {subs.length > 0 && (
          <ChipRow>
            <Chip label={`All ${EQUIPMENT_LABEL[equipment!].toLowerCase()}`} active={!sub} onPress={() => setSub(null)} />
            {subs.map((x) => <Chip key={x} label={x} active={sub === x} onPress={() => setSub(sub === x ? null : x)} />)}
          </ChipRow>
        )}
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
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/progress/[id]', params: { id: item.id } })}
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.text}>
              {item.name}
              
            </Text>
            <EquipmentText exercise={item} brands={brands} prefix={MUSCLE_LABEL[item.primaryMuscle]} size={14} />
            </View>
            {(series.get(item.id)?.length ?? 0) >= 2 && (
              <View style={{ width: 72 }}>
                <LineChart points={series.get(item.id)!.map((y, i) => ({ x: i, y }))} height={32} />
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const addBtn = {
  width: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
} as const;
