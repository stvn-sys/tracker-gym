import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { showAlert } from '../../components/Dialog';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useProfile } from '../../components/ProfileContext';
import { Button, Card, Chip, ChipRow, inputStyle, SectionTitle, styles } from '../../components/ui';
import {
  CABLE_ATTACHMENTS, DEFAULT_ADDON_PLATES_KG, PULLEY_OPTIONS, DEFAULT_INCREMENT_KG, EQUIPMENT, EQUIPMENT_LABEL,
  supportsAddonPlates, supportsAttachment, supportsBrand, supportsLaterality, type Equipment,
} from '../../data/equipment';
import { MUSCLES, MUSCLE_LABEL, type Muscle } from '../../data/muscles';
import { formatWeight, fromDisplay, toDisplay } from '../../domain/units';
import { createBrand, createSeries, listBrands, type Brand } from '../../repo/brands';
import {
  createExercise, deleteExercise, getExercise, updateExercise, type ExerciseInput,
} from '../../repo/exercises';
import { colors } from '../../theme/colors';

const ADDON_OPTIONS_KG = [0.5, 1, 1.25, 2.5];

const blank: ExerciseInput = {
  name: '', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'dumbbell',
  incrementKg: DEFAULT_INCREMENT_KG.dumbbell, addonPlatesKg: [], laterality: 'bilateral',
  attachment: null, pulleys: null, restSeconds: null, brandId: null, seriesId: null,
};

const REST_OPTIONS = [30, 60, 90, 120, 150, 180];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function ExerciseEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const unit = profile.unit;

  const [form, setForm] = useState<ExerciseInput>(blank);
  const [incrementText, setIncrementText] = useState(() => fmt(toDisplay(blank.incrementKg, unit)));
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrand, setNewBrand] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [isBuiltin, setIsBuiltin] = useState(false);

  useEffect(() => {
    listBrands(db).then(setBrands);
    if (isNew) return;
    getExercise(db, id).then((e) => {
      if (!e) return;
      const { id: _id, builtinKey, ...rest } = e;
      setForm(rest);
      setIsBuiltin(!!builtinKey);
      setIncrementText(fmt(toDisplay(e.incrementKg, unit)));
    });
  }, [db, id, isNew, unit]);

  const set = <K extends keyof ExerciseInput>(k: K, v: ExerciseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const changeEquipment = (eq: Equipment) => {
    setForm((f) => ({
      ...f,
      equipment: eq,
      incrementKg: DEFAULT_INCREMENT_KG[eq],
      addonPlatesKg: DEFAULT_ADDON_PLATES_KG[eq] ?? [],
      laterality: supportsLaterality(eq) ? (f.laterality ?? 'bilateral') : null,
      attachment: supportsAttachment(eq) ? f.attachment : null,
      pulleys: supportsAttachment(eq) ? (f.pulleys ?? 1) : null,
      brandId: supportsBrand(eq) ? f.brandId : null,
      seriesId: supportsBrand(eq) ? f.seriesId : null,
    }));
    setIncrementText(fmt(toDisplay(DEFAULT_INCREMENT_KG[eq], unit)));
  };

  const toggleSecondary = (m: Muscle) =>
    set('secondaryMuscles', form.secondaryMuscles.includes(m)
      ? form.secondaryMuscles.filter((x) => x !== m)
      : [...form.secondaryMuscles, m]);

  const toggleAddon = (kg: number) =>
    set('addonPlatesKg', form.addonPlatesKg.includes(kg)
      ? form.addonPlatesKg.filter((x) => x !== kg)
      : [...form.addonPlatesKg, kg].sort((a, b) => a - b));

  const addBrand = async () => {
    if (!newBrand.trim()) return;
    const bid = await createBrand(db, newBrand);
    setNewBrand('');
    setBrands(await listBrands(db));
    setForm((f) => ({ ...f, brandId: bid, seriesId: null }));
  };

  const addSeries = async () => {
    if (!newSeries.trim() || !form.brandId) return;
    const sid = await createSeries(db, form.brandId, newSeries);
    setNewSeries('');
    setBrands(await listBrands(db));
    set('seriesId', sid);
  };

  const save = async () => {
    if (!form.name.trim()) { showAlert('Name required'); return; }
    const inc = parseFloat(incrementText.replace(',', '.'));
    const data: ExerciseInput = {
      ...form,
      incrementKg: Number.isFinite(inc) && inc >= 0 ? Math.round(fromDisplay(inc, unit) * 1000) / 1000 : form.incrementKg,
      secondaryMuscles: form.secondaryMuscles.filter((m) => m !== form.primaryMuscle),
    };
    if (isNew) await createExercise(db, data);
    else await updateExercise(db, id, data);
    router.back();
  };

  const remove = () =>
    showAlert('Delete exercise?', isBuiltin ? 'You can bring it back with "Restore default exercises".' : 'Your past workouts keep their history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExercise(db, id); router.back(); } },
    ]);

  const brand = brands.find((b) => b.id === form.brandId);
  const eq = form.equipment;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'New exercise' : 'Edit exercise' }} />

      <TextInput value={form.name} onChangeText={(v) => set('name', v)} placeholder="Exercise name"
        placeholderTextColor={colors.textDim} style={[inputStyle, { fontSize: 18, fontWeight: '700' }]} />

      <SectionTitle>Equipment</SectionTitle>
      <ChipRow wrap>
        {EQUIPMENT.map((e) => <Chip key={e} label={EQUIPMENT_LABEL[e]} active={eq === e} onPress={() => changeEquipment(e)} />)}
      </ChipRow>

      {supportsLaterality(eq) && (
        <>
          <SectionTitle>Laterality</SectionTitle>
          <ChipRow wrap>
            <Chip label="Bilateral" active={form.laterality === 'bilateral'} onPress={() => set('laterality', 'bilateral')} />
            <Chip label="Unilateral" active={form.laterality === 'unilateral'} onPress={() => set('laterality', 'unilateral')} />
          </ChipRow>
        </>
      )}

      {supportsAttachment(eq) && (
        <>
          <SectionTitle>Cable</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Text style={styles.dim}>Pulleys</Text>
            <ChipRow wrap>
              {PULLEY_OPTIONS.map((n) => (
                <Chip key={n} label={String(n)} active={form.pulleys === n} onPress={() => set('pulleys', n)} />
              ))}
            </ChipRow>
            <Text style={styles.dim}>Attachment</Text>
            <ChipRow wrap>
              {CABLE_ATTACHMENTS.map((a) => (
                <Chip key={a} label={a} active={form.attachment === a} onPress={() => set('attachment', form.attachment === a ? null : a)} />
              ))}
            </ChipRow>
          </Card>
        </>
      )}

      {supportsBrand(eq) && (
        <>
          <SectionTitle>Machine</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Text style={styles.dim}>Machine brand</Text>
            <ChipRow wrap>
              {brands.map((b) => (
                <Chip key={b.id} label={b.name} active={form.brandId === b.id}
                  onPress={() => setForm((f) => ({ ...f, brandId: f.brandId === b.id ? null : b.id, seriesId: null }))} />
              ))}
            </ChipRow>
            <AddRow value={newBrand} onChange={setNewBrand} onAdd={addBrand} placeholder="Add a brand" />
            <Text style={styles.dim}>Series of machine</Text>
            {brand ? (
              <>
                <ChipRow wrap>
                  {brand.series.map((s) => (
                    <Chip key={s.id} label={s.name} active={form.seriesId === s.id}
                      onPress={() => set('seriesId', form.seriesId === s.id ? null : s.id)} />
                  ))}
                </ChipRow>
                <AddRow value={newSeries} onChange={setNewSeries} onAdd={addSeries} placeholder={`Add a ${brand.name} series`} />
              </>
            ) : (
              <Text style={[styles.dim, { fontStyle: 'italic' }]}>Pick a brand first</Text>
            )}
          </Card>
        </>
      )}

      <SectionTitle>Rest timer</SectionTitle>
      <ChipRow wrap>
        <Chip label={`Default (${mmss(profile.restSeconds)})`} active={form.restSeconds == null} onPress={() => set('restSeconds', null)} />
        {REST_OPTIONS.map((r) => <Chip key={r} label={mmss(r)} active={form.restSeconds === r} onPress={() => set('restSeconds', r)} />)}
      </ChipRow>

      {eq !== 'band' && (
        <>
          <SectionTitle>Progression</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Text style={styles.dim}>Weight added when you tap + during a workout ({unit})</Text>
            <TextInput value={incrementText} onChangeText={setIncrementText} keyboardType="decimal-pad" style={inputStyle} />
            {supportsAddonPlates(eq) && (
              <>
                <Text style={styles.dim}>Add-on plates you have for this stack (shown as extra buttons)</Text>
                <ChipRow wrap>
                  {ADDON_OPTIONS_KG.map((kg) => (
                    <Chip key={kg} label={`+${formatWeight(kg, 'kg')}`} active={form.addonPlatesKg.includes(kg)} onPress={() => toggleAddon(kg)} />
                  ))}
                </ChipRow>
              </>
            )}
          </Card>
        </>
      )}

      <SectionTitle>Primary muscle</SectionTitle>
      <ChipRow wrap>
        {MUSCLES.map((m) => <Chip key={m} label={MUSCLE_LABEL[m]} active={form.primaryMuscle === m} onPress={() => set('primaryMuscle', m)} />)}
      </ChipRow>

      <SectionTitle>Secondary muscles</SectionTitle>
      <ChipRow wrap>
        {MUSCLES.filter((m) => m !== form.primaryMuscle).map((m) => (
          <Chip key={m} label={MUSCLE_LABEL[m]} active={form.secondaryMuscles.includes(m)} onPress={() => toggleSecondary(m)} />
        ))}
      </ChipRow>

      <View style={{ gap: 10, marginTop: 16 }}>
        <Button label={isNew ? 'Create exercise' : 'Save'} onPress={save} />
        {!isNew && <Button label="View 1RM progress" variant="ghost" onPress={() => router.push({ pathname: '/progress/[id]', params: { id } })} />}
        {!isNew && <Button label="Delete exercise" variant="danger" onPress={remove} />}
      </View>
    </ScrollView>
  );
}

function AddRow({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textDim}
        style={[inputStyle, { flex: 1, paddingVertical: 8 }]} onSubmitEditing={onAdd} />
      <Chip label="Add" onPress={onAdd} />
    </View>
  );
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);
