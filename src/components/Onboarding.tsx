import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { CABLE_ATTACHMENTS, EQUIPMENT, EQUIPMENT_LABEL, type Equipment } from '../data/equipment';
import { ACTIVITY, startingTargets, type Activity } from '../domain/targets';
import { fromDisplay } from '../domain/units';
import { logBodyweight } from '../repo/bodyweight';
import { connectHealthConnect, healthConnectStatus } from '../repo/healthConnect';
import { DEFAULT_GOALS, getGoals, setGoals } from '../repo/kv';
import { colors } from '../theme/colors';
import { useDataVersion } from './DataVersion';
import { BarTypesEditor, BrandsEditor, ListEditor } from './EquipmentEditors';
import { usePrefs } from './Prefs';
import { useProfile } from './ProfileContext';
import { Segmented, ToggleRow, Group } from './SettingsUI';
import { Button, Chip, ChipRow, inputStyle, styles } from './ui';

const STEPS = ['Welcome', 'You', 'Goal', 'Targets', 'Training', 'Equipment', 'Equipment details', 'Health & reminders'] as const;
const RATES = [-0.75, -0.5, -0.25, 0, 0.25, 0.5];
const REST = [60, 90, 120, 150, 180];
const num = (t: string) => { const v = parseFloat(t.replace(',', '.')); return Number.isFinite(v) ? v : null; };

/** First-launch questionnaire: profile, nutrition targets, training setup, equipment, health. */
export function Onboarding() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { bump } = useDataVersion();
  const { prefs, setPrefs } = usePrefs();
  const { profile, update } = useProfile();
  const [step, setStep] = useState(0);

  // You
  const [name, setName] = useState(prefs.name);
  const [unit, setUnit] = useState(profile.unit);
  const [lengthUnit, setLengthUnit] = useState(prefs.lengthUnit);
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender ?? 'male');
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  // Goal
  const [activity, setActivity] = useState<Activity>(prefs.activity);
  const [rate, setRate] = useState(0);
  const [adaptive, setAdaptive] = useState(true);
  // Targets (editable, filled from the calculation)
  const [t, setT] = useState<Record<string, string>>({});
  // Training
  const [gym, setGym] = useState(prefs.gyms[0] ?? '');
  const [rest, setRest] = useState(profile.restSeconds);
  const [schedule, setSchedule] = useState(prefs.schedule);
  const [weekStart, setWeekStart] = useState(prefs.weekStart);
  // Equipment
  const [have, setHave] = useState<Equipment[]>(['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight']);
  // Health
  const [hc, setHc] = useState('');

  const kg = (() => { const v = num(weight); return v == null ? null : fromDisplay(v, unit); })();
  const cm = (() => { const v = num(height); return v == null ? null : lengthUnit === 'in' ? v * 2.54 : v; })();
  const ageN = num(age);
  const calc = kg && cm && ageN ? startingTargets({ sex: gender, kg, cm, age: ageN, activity, rateKgWeek: rate }) : null;

  const fillTargets = () => {
    const base = calc ?? { calories: DEFAULT_GOALS.calories, proteinG: DEFAULT_GOALS.proteinG, fatG: DEFAULT_GOALS.fatG, carbsG: DEFAULT_GOALS.carbsG, waterMl: DEFAULT_GOALS.waterMl };
    setT({
      calories: String(base.calories), proteinG: String(base.proteinG), fatG: String(base.fatG), carbsG: String(base.carbsG),
      waterMl: String(base.waterMl), steps: '10000', sleepMin: '480', cardioMinWeek: '150',
    });
  };

  const next = async () => {
    if (STEPS[step] === 'You') {
      setPrefs({ name: name.trim(), lengthUnit, heightCm: cm });
      await update('unit', unit);
      await update('gender', gender);
      await update('age', ageN && ageN > 5 && ageN < 110 ? Math.round(ageN) : null);
      if (kg && kg > 0) await logBodyweight(db, Math.round(kg * 100) / 100);
    }
    if (STEPS[step] === 'Goal') fillTargets();
    if (STEPS[step] === 'Targets') {
      const g = await getGoals(db);
      const out = { ...g };
      for (const [k, v] of Object.entries(t)) { const n = num(v); if (n != null && n > 0) (out as Record<string, number>)[k] = n; }
      await setGoals(db, out);
      setPrefs({ activity, autoMacros: { ...prefs.autoMacros, on: adaptive, rateKgWeek: rate, lastRun: Date.now() } });
    }
    if (STEPS[step] === 'Training') {
      await update('restSeconds', rest);
      setPrefs({ gyms: gym.trim() ? [gym.trim()] : [], schedule, weekStart });
    }
    if (STEPS[step] === 'Equipment') {
      // Give each chosen type its own (empty) attachment list; cables start with common ones.
      const att = { ...prefs.attachmentsByEq };
      if (have.includes('cable') && !att.cable?.length) att.cable = [...CABLE_ATTACHMENTS].filter((a) => a !== 'No attachment');
      setPrefs({ equipment: have, attachmentsByEq: att });
    }
    if (step === STEPS.length - 1) { setPrefs({ onboarded: true }); bump(); return; }
    setStep(step + 1);
  };

  const field = (label: string, value: string, onChange: (v: string) => void, props: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.dim}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholderTextColor={colors.textDim} style={inputStyle} {...props} />
    </View>
  );

  const s = STEPS[step];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEPS.map((x, i) => <View key={x} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.surfaceAlt }} />)}
        </View>
        <Text style={{ color: colors.textDim, fontSize: 13 }}>Step {step + 1} of {STEPS.length}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {s === 'Welcome' && (
          <>
            <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900' }}>Welcome to Kinetic</Text>
            <Text style={[styles.text, { fontSize: 17, lineHeight: 24 }]}>
              A few quick questions to set up your targets, training and equipment. Everything stays on this phone, and you can change it all later in Settings.
            </Text>
          </>
        )}

        {s === 'You' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>About you</Text>
            {field('Name (optional)', name, setName, { placeholder: 'Your name' })}
            <Text style={styles.dim}>Units</Text>
            <Segmented options={[{ label: 'kg', value: 'kg' }, { label: 'lbs', value: 'lbs' }]} value={unit} onChange={setUnit} />
            <Segmented options={[{ label: 'cm', value: 'cm' }, { label: 'inches', value: 'in' }]} value={lengthUnit} onChange={setLengthUnit} />
            <Text style={styles.dim}>Sex (for calorie estimates)</Text>
            <Segmented options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} value={gender} onChange={setGender} />
            {field('Age', age, setAge, { keyboardType: 'number-pad', placeholder: 'e.g. 30' })}
            {field(`Height (${lengthUnit})`, height, setHeight, { keyboardType: 'decimal-pad', placeholder: lengthUnit === 'cm' ? 'e.g. 180' : 'e.g. 71' })}
            {field(`Weight (${unit})`, weight, setWeight, { keyboardType: 'decimal-pad', placeholder: unit === 'kg' ? 'e.g. 80' : 'e.g. 176' })}
          </>
        )}

        {s === 'Goal' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>Your goal</Text>
            <Text style={styles.dim}>How active are you day to day?</Text>
            <ChipRow wrap>{ACTIVITY.map((a) => <Chip key={a.key} label={a.label} active={activity === a.key} onPress={() => setActivity(a.key)} />)}</ChipRow>
            <Text style={styles.dim}>Weight change per week ({unit === 'kg' ? 'kg' : 'kg, shown in kg'})</Text>
            <ChipRow wrap>{RATES.map((r) => <Chip key={r} label={r === 0 ? 'Maintain' : `${r > 0 ? '+' : '−'}${Math.abs(r)}`} active={rate === r} onPress={() => setRate(r)} />)}</ChipRow>
            <Group>
              <ToggleRow label="Adjust targets weekly" sub="Calories follow your weight trend, at most 250 kcal per week." value={adaptive} onChange={setAdaptive} />
            </Group>
            {calc ? <Text style={styles.text}>Estimated maintenance: {calc.tdee} kcal/day → target {calc.calories} kcal.</Text>
              : <Text style={styles.dim}>Fill in age, height and weight on the previous step for a personal estimate; otherwise defaults are used.</Text>}
          </>
        )}

        {s === 'Targets' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>Daily targets</Text>
            <Text style={styles.dim}>Suggested from your answers. Change anything you like.</Text>
            {([['calories', 'Calories (kcal)'], ['proteinG', 'Protein (g)'], ['fatG', 'Fat (g)'], ['carbsG', 'Carbs (g)'], ['waterMl', 'Water (ml)'],
              ['steps', 'Steps'], ['sleepMin', 'Sleep (minutes)'], ['cardioMinWeek', 'Cardio (minutes per week)']] as const).map(([k, l]) => (
              <View key={k}>{field(l, t[k] ?? '', (v) => setT((x) => ({ ...x, [k]: v })), { keyboardType: 'number-pad' })}</View>
            ))}
          </>
        )}

        {s === 'Training' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>Training</Text>
            {field('Your gym', gym, setGym, { placeholder: 'e.g. Basic-Fit Centrum' })}
            <Text style={styles.dim}>Default rest between sets</Text>
            <ChipRow wrap>{REST.map((r) => <Chip key={r} label={`${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`} active={rest === r} onPress={() => setRest(r)} />)}</ChipRow>
            <Text style={styles.dim}>How do you plan workouts?</Text>
            <Segmented options={[{ label: 'Fixed weekdays', value: 'weekdays' }, { label: 'Rotation', value: 'rotation' }]} value={schedule} onChange={setSchedule} />
            <Text style={styles.dim}>Week starts on</Text>
            <Segmented options={[{ label: 'Monday', value: 1 }, { label: 'Sunday', value: 0 }]} value={weekStart} onChange={setWeekStart} />
          </>
        )}

        {s === 'Equipment' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>Equipment you use</Text>
            <ChipRow wrap>
              {EQUIPMENT.map((e) => (
                <Chip key={e} label={EQUIPMENT_LABEL[e]} active={have.includes(e)}
                  onPress={() => setHave((h) => (h.includes(e) ? h.filter((x) => x !== e) : [...h, e]))} />
              ))}
            </ChipRow>
            <Text style={styles.dim}>Next you can set bar weights, machine brands and attachments for these.</Text>
          </>
        )}

        {s === 'Equipment details' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>Equipment details</Text>
            {have.includes('barbell') && (<><Text style={styles.section}>Bars and their weight</Text><BarTypesEditor /></>)}
            {(have.includes('machine') || have.includes('smith')) && <BrandsEditor />}
            {have.filter((e) => ['cable', 'machine', 'barbell', 'smith'].includes(e)).map((e) => (
              <View key={e} style={{ gap: 6 }}>
                <Text style={styles.section}>{EQUIPMENT_LABEL[e]} attachments</Text>
                <ListEditor items={prefs.attachmentsByEq[e] ?? []} placeholder="Add an attachment"
                  onChange={(list) => setPrefs({ attachmentsByEq: { ...prefs.attachmentsByEq, [e]: list } })} />
              </View>
            ))}
            <Text style={styles.dim}>Leave a list empty if that equipment has no attachments. You can change all of this in Settings › Equipment & attachments.</Text>
          </>
        )}

        {s === 'Health & reminders' && (
          <>
            <Text style={[styles.section, { fontSize: 28, marginTop: 0 }]}>Health & reminders</Text>
            {Platform.OS === 'android' && (
              <>
                <Text style={styles.text}>Connect Health Connect to bring in steps, sleep, heart data and cardio from your watch (e.g. Fitbit).</Text>
                <Button label="Connect Health Connect" variant="ghost" onPress={async () => {
                  const st = await healthConnectStatus();
                  if (st !== 'available') { setHc(st === 'not-installed' ? 'Health Connect is not installed.' : 'Health Connect needs an update.'); return; }
                  try {
                    const g = await connectHealthConnect();
                    setPrefs({ healthConnect: { enabled: g.length > 0, lastSync: null } });
                    setHc(g.length ? `Connected: ${g.length} data types allowed.` : 'No access given.');
                  } catch { setHc('Could not connect.'); }
                }} />
                {hc ? <Text style={styles.dim}>{hc}</Text> : null}
              </>
            )}
            <Group>
              <ToggleRow label="Workout reminder (17:30 on workout days)" value={prefs.remindWorkout.on} onChange={(on) => setPrefs({ remindWorkout: { ...prefs.remindWorkout, on } })} />
              <ToggleRow label="Weigh-in reminder (07:30)" value={prefs.remindWeigh.on} onChange={(on) => setPrefs({ remindWeigh: { ...prefs.remindWeigh, on } })} />
              <ToggleRow label="Meal logging reminders (9:00 / 13:00 / 19:00)" value={Object.values(prefs.remindMeals).every((m) => m.on)}
                onChange={(on) => setPrefs({ remindMeals: { breakfast: { ...prefs.remindMeals.breakfast, on }, lunch: { ...prefs.remindMeals.lunch, on }, dinner: { ...prefs.remindMeals.dinner, on } } })} />
              <ToggleRow label="Water reminders (every 2 h)" value={prefs.remindWater.on} onChange={(on) => setPrefs({ remindWater: { ...prefs.remindWater, on } })} />
            </Group>
            <Text style={styles.dim}>Times can be changed in Settings › Reminders.</Text>
          </>
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: colors.border }}>
        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Back</Text>
          </Pressable>
        )}
        <Pressable onPress={next} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.accent }}>
          <Text style={{ color: '#0B0B0D', fontWeight: '800' }}>{step === 0 ? 'Get started' : step === STEPS.length - 1 ? 'Finish' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
