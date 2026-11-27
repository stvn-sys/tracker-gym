import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { showAlert } from './Dialog';
import { useSQLiteContext } from 'expo-sqlite';
import { useProfile } from './ProfileContext';
import { Button, Card, Chip, ChipRow, inputStyle, SectionTitle, styles } from './ui';
import {
  DEFAULT_ADDON_PLATES_KG, VARIANTS, supportsVariant, PULLEY_OPTIONS, supportsBarType, DEFAULT_INCREMENT_KG, EQUIPMENT, EQUIPMENT_LABEL,
  supportsAddonPlates, supportsPulleys, supportsBrand, supportsStartWeight, MACHINE_LOADS, supportsLaterality, type Equipment,
} from '../data/equipment';
import { MUSCLE_LABEL, MUSCLE_REGIONS, type Muscle } from '../data/muscles';
import { usePrefs } from './Prefs';
import { formatWeight, fromDisplay, toDisplay } from '../domain/units';
import { createBrand, createSeries, listBrands, type Brand } from '../repo/brands';
import {
  createExercise, deleteExercise, getExercise, updateExercise, type ExerciseInput,
} from '../repo/exercises';
import { colors } from '../theme/colors';


const blank: ExerciseInput = {
  name: '', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'dumbbell',
  incrementKg: DEFAULT_INCREMENT_KG.dumbbell, addonPlatesKg: [], laterality: 'bilateral',
  attachment: null, pulleys: null, restSeconds: null, barType: null, notes: null, variant: null, brandId: null, seriesId: null,
  machineLoad: null, startWeightKg: null,
};

/** Applies an equipment choice and its defaults, keeping options that still apply. */
function withEquipment(f: ExerciseInput, eq: Equipment): ExerciseInput {
  return {
    ...f,
    equipment: eq,
    incrementKg: DEFAULT_INCREMENT_KG[eq],
    addonPlatesKg: DEFAULT_ADDON_PLATES_KG[eq] ?? [],
    laterality: supportsLaterality(eq) ? (f.laterality ?? 'bilateral') : null,
    attachment: f.equipment === eq ? f.attachment : null,
    pulleys: supportsPulleys(eq) ? (f.pulleys ?? 1) : null,
    barType: supportsBarType(eq) ? (f.barType ?? 'Olympic barbell') : null,
    variant: supportsVariant(eq) ? (f.variant && VARIANTS[eq]!.includes(f.variant) ? f.variant : VARIANTS[eq]![0]) : null,
    brandId: supportsBrand(eq) ? f.brandId : null,
    seriesId: supportsBrand(eq) ? f.seriesId : null,
    machineLoad: eq === 'machine' ? (f.machineLoad ?? 'pin') : null,
    startWeightKg: supportsStartWeight(eq) && f.equipment === eq ? f.startWeightKg : null,
  };
}

const REST_OPTIONS = [30, 60, 90, 120, 150, 180];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

interface Props {
  /** Exercise to edit, or null to create a new one. */
  id: string | null;
  initialName?: string;
  initialEquipment?: Equipment | null;
  onSaved: (id: string) => void;
  onDeleted?: () => void;
  /** Shows a "View progress" button when given. */
  onViewProgress?: () => void;
}

/** The full create/edit exercise form, used by the library and the exercise picker. */
export function ExerciseForm({ id, initialName = '', initialEquipment = null, onSaved, onDeleted, onViewProgress }: Props) {
  const isNew = id == null;
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const { prefs } = usePrefs();
  const unit = profile.unit;

  const start = initialEquipment ? withEquipment({ ...blank, name: initialName }, initialEquipment) : { ...blank, name: initialName };
  const [form, setForm] = useState<ExerciseInput>(start);
  const [incrementText, setIncrementText] = useState(() => fmt(toDisplay(start.incrementKg, unit)));
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrand, setNewBrand] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [otherBrand, setOtherBrand] = useState(false);
  const [otherSeries, setOtherSeries] = useState(false);
  const [customPlate, setCustomPlate] = useState<string | null>(null);
  const [startText, setStartText] = useState('');

  useEffect(() => {
    listBrands(db).then(setBrands);
    if (isNew) return;
    getExercise(db, id!).then((e) => {
      if (!e) return;
      const { id: _id, builtinKey, ...rest } = e;
      setForm(rest);

      setIncrementText(fmt(toDisplay(e.incrementKg, unit)));
      setStartText(e.startWeightKg != null ? fmt(toDisplay(e.startWeightKg, unit)) : '');
    });
  }, [db, id, isNew, unit]);

  const set = <K extends keyof ExerciseInput>(k: K, v: ExerciseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const changeEquipment = (eq: Equipment) => {
    setForm((f) => withEquipment(f, eq));
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
    setOtherBrand(false);
  };

  const addSeries = async () => {
    if (!newSeries.trim() || !form.brandId) return;
    const sid = await createSeries(db, form.brandId, newSeries);
    setNewSeries('');
    setBrands(await listBrands(db));
    set('seriesId', sid);
    setOtherSeries(false);
  };

  const save = async () => {
    if (!form.name.trim()) { showAlert('Name required'); return; }
    const inc = parseFloat(incrementText.replace(',', '.'));
    const data: ExerciseInput = {
      ...form,
      incrementKg: Number.isFinite(inc) && inc >= 0 ? Math.round(fromDisplay(inc, unit) * 1000) / 1000 : form.incrementKg,
      secondaryMuscles: form.secondaryMuscles.filter((m) => m !== form.primaryMuscle),
      startWeightKg: supportsStartWeight(form.equipment) && startText.trim() !== '' && Number.isFinite(parseFloat(startText.replace(',', '.')))
        ? Math.round(fromDisplay(parseFloat(startText.replace(',', '.')), unit) * 1000) / 1000 : null,
    };
    if (isNew) onSaved(await createExercise(db, data));
    else { await updateExercise(db, id!, data); onSaved(id!); }
  };

  const remove = () =>
    showAlert('Delete exercise?', 'Your past workouts keep their history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExercise(db, id!); onDeleted?.(); } },
    ]);

  const brand = brands.find((b) => b.id === form.brandId);
  const eq = form.equipment;
  const eqAttachments = prefs.attachmentsByEq[eq] ?? [];
  const attachments = eqAttachments.length ? [...new Set([...eqAttachments, ...(form.attachment ? [form.attachment] : [])])] : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">

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

      {supportsVariant(eq) && (
        <>
          <SectionTitle>Type</SectionTitle>
          <ChipRow wrap>
            {VARIANTS[eq]!.map((v) => <Chip key={v} label={v} active={form.variant === v} onPress={() => set('variant', v)} />)}
          </ChipRow>
          <Text style={styles.dim}>
            {form.variant?.startsWith('Assisted') ? 'You log the assistance as −kg; less assistance means more progress.'
              : form.variant === 'Weighted' ? 'You log the extra weight as +kg.' : 'Reps only, no weight.'}
          </Text>
        </>
      )}

      {supportsBarType(eq) && (
        <>
          <SectionTitle>Bar</SectionTitle>
          <ChipRow wrap>
            {[...new Set([...prefs.barTypes, ...(form.barType ? [form.barType] : [])])].map((b) => <Chip key={b} label={b} active={form.barType === b} onPress={() => { set('barType', b); if (prefs.barWeights[b] != null) setStartText(fmt(toDisplay(prefs.barWeights[b], unit))); }} />)}
          </ChipRow>
        </>
      )}

      {supportsPulleys(eq) && (
        <>
          <SectionTitle>Pulleys</SectionTitle>
          <ChipRow wrap>
            {PULLEY_OPTIONS.map((n) => (
              <Chip key={n} label={String(n)} active={form.pulleys === n} onPress={() => set('pulleys', n)} />
            ))}
          </ChipRow>
        </>
      )}

      {attachments.length > 0 && (
        <>
          <SectionTitle>Attachment</SectionTitle>
          <ChipRow wrap>
            {attachments.map((a) => (
              <Chip key={a} label={a} active={form.attachment === a} onPress={() => set('attachment', form.attachment === a ? null : a)} />
            ))}
          </ChipRow>
        </>
      )}

      {eq === 'machine' && (
        <>
          <SectionTitle>Loading</SectionTitle>
          <ChipRow wrap>
            {MACHINE_LOADS.map((l) => <Chip key={l.value} label={l.label} active={form.machineLoad === l.value} onPress={() => setForm((f) => ({ ...f, machineLoad: l.value, addonPlatesKg: l.value === 'plate' ? [] : f.addonPlatesKg }))} />)}
          </ChipRow>
        </>
      )}

      {supportsBrand(eq) && (
        <>
          <SectionTitle>Brand</SectionTitle>
          <ChipRow wrap>
            {brands.map((b) => (
              <Chip key={b.id} label={b.name} active={form.brandId === b.id}
                onPress={() => { setOtherBrand(false); setForm((f) => ({ ...f, brandId: f.brandId === b.id ? null : b.id, seriesId: null })); }} />
            ))}
            <Chip label="Other" active={otherBrand} onPress={() => setOtherBrand((o) => !o)} />
          </ChipRow>
          {otherBrand && <AddRow value={newBrand} onChange={setNewBrand} onAdd={addBrand} placeholder="Brand name" />}
          {brand && (
            <>
              <SectionTitle>Series</SectionTitle>
              <ChipRow wrap>
                {brand.series.map((x) => (
                  <Chip key={x.id} label={x.name} active={form.seriesId === x.id}
                    onPress={() => { setOtherSeries(false); set('seriesId', form.seriesId === x.id ? null : x.id); }} />
                ))}
                <Chip label="Other" active={otherSeries} onPress={() => setOtherSeries((o) => !o)} />
              </ChipRow>
              {otherSeries && <AddRow value={newSeries} onChange={setNewSeries} onAdd={addSeries} placeholder={`${brand.name} series name`} />}
            </>
          )}
        </>
      )}

      {supportsStartWeight(eq) && (
        <>
          <SectionTitle>Starting weight ({unit})</SectionTitle>
          <TextInput value={startText} onChangeText={setStartText} keyboardType="decimal-pad" placeholder={eq === 'barbell' ? 'Empty bar weight' : eq === 'cable' ? 'Weight of the first pin' : eq === 'smith' ? 'Bar weight of this smith machine' : 'Weight with nothing added'}
            placeholderTextColor={colors.textDim} style={inputStyle} />
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
            {supportsAddonPlates(eq, form.machineLoad) && (
              <>
                <Text style={styles.dim}>Mini plates you can add to the stack (shown as extra buttons)</Text>
                <ChipRow wrap>
                  {[...new Set([1.25, 2.5, ...form.addonPlatesKg])].sort((x, y) => x - y).map((kg) => (
                    <Chip key={kg} label={`+${formatWeight(kg, unit)}`} active={form.addonPlatesKg.includes(kg)} onPress={() => toggleAddon(kg)} />
                  ))}
                  <Chip label="Custom" active={customPlate != null} onPress={() => setCustomPlate((c) => (c == null ? '' : null))} />
                </ChipRow>
                {customPlate != null && (
                  <AddRow value={customPlate} onChange={setCustomPlate} placeholder={`Plate weight (${unit})`} onAdd={() => {
                    const v = parseFloat(customPlate.replace(',', '.'));
                    if (Number.isFinite(v) && v > 0) {
                      const kg = Math.round(fromDisplay(v, unit) * 1000) / 1000;
                      if (!form.addonPlatesKg.includes(kg)) toggleAddon(kg);
                    }
                    setCustomPlate(null);
                  }} />
                )}
              </>
            )}
          </Card>
        </>
      )}

      <SectionTitle>Primary muscle</SectionTitle>
      {MUSCLE_REGIONS.map((r) => (
        <View key={r.label} style={{ gap: 8 }}>
          <Text style={styles.dim}>{r.label}</Text>
          <ChipRow wrap>
            {r.muscles.map((m) => <Chip key={m} label={MUSCLE_LABEL[m]} active={form.primaryMuscle === m} onPress={() => set('primaryMuscle', m)} />)}
          </ChipRow>
        </View>
      ))}

      <SectionTitle>Secondary muscles</SectionTitle>
      {MUSCLE_REGIONS.map((r) => (
        <View key={r.label} style={{ gap: 8 }}>
          <Text style={styles.dim}>{r.label}</Text>
          <ChipRow wrap>
            {r.muscles.filter((m) => m !== form.primaryMuscle).map((m) => (
              <Chip key={m} label={MUSCLE_LABEL[m]} active={form.secondaryMuscles.includes(m)} onPress={() => toggleSecondary(m)} />
            ))}
          </ChipRow>
        </View>
      ))}

      <SectionTitle>Notes</SectionTitle>
      <TextInput value={form.notes ?? ''} onChangeText={(v) => set('notes', v)} multiline
        placeholder="Seat height, grip, cues… shown every time you do this exercise" placeholderTextColor={colors.textDim}
        style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]} />

      <View style={{ gap: 10, marginTop: 16 }}>
        <Button label={isNew ? 'Create exercise' : 'Save'} onPress={save} />
        {!isNew && onViewProgress && <Button label="View progress" variant="ghost" onPress={onViewProgress} />}
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
