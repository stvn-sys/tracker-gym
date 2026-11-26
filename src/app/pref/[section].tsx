import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useDataVersion } from '../../components/DataVersion';
import { showAlert } from '../../components/Dialog';
import { usePrefs } from '../../components/Prefs';
import { useProfile } from '../../components/ProfileContext';
import { ensureNotificationPermission } from '../../components/Reminders';
import { ChoiceRow, Group, Step, TimeRow, ToggleRow } from '../../components/SettingsUI';
import { Button, inputStyle, styles } from '../../components/ui';
import { playBeep, buzz } from '../../components/alerts';
import { APP_VERSION } from '../../data/appInfo';
import { EQUIPMENT, EQUIPMENT_LABEL } from '../../data/equipment';
import { exportAll, importAll, resetAll } from '../../repo/backup';
import { DEFAULT_GOALS, getGoals, setGoals, type Goals } from '../../repo/kv';
import { ACCENTS, colors, type Accent } from '../../theme/colors';

const TITLES: Record<string, string> = {
  profile: 'Profile', workout: 'Workout', alerts: 'Timer alerts', reminders: 'Reminders', schedule: 'Plan & schedule',
  units: 'Units & language', equipment: 'Equipment', goals: 'Nutrition & goals', look: 'Look & Home', data: 'Data & backup', about: 'About',
};

export default function PrefSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { gap: 22, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: TITLES[section] ?? 'Settings' }} />
      {section === 'profile' && <ProfileSection />}
      {section === 'workout' && <WorkoutSection />}
      {section === 'alerts' && <AlertsSection />}
      {section === 'reminders' && <RemindersSection />}
      {section === 'schedule' && <ScheduleSection />}
      {section === 'units' && <UnitsSection />}
      {section === 'equipment' && <EquipmentSection />}
      {section === 'goals' && <GoalsSection />}
      {section === 'look' && <LookSection />}
      {section === 'data' && <DataSection />}
      {section === 'about' && <AboutSection />}
    </ScrollView>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12, minHeight: 52 }}>
      <Text style={{ color: colors.text, fontSize: 17, flex: 1 }}>{label}</Text>
      {children}
    </View>
  );
}

const smallInput = { ...inputStyle, width: 120, textAlign: 'right' as const, paddingVertical: 8 };

function ProfileSection() {
  const { prefs, setPrefs } = usePrefs();
  const { profile, update } = useProfile();
  return (
    <>
      <Group footer="Gender, age and your latest bodyweight are used to rank your lifts against strength standards.">
        <FieldRow label="Name">
          <TextInput defaultValue={prefs.name} onEndEditing={(e) => setPrefs({ name: e.nativeEvent.text.trim() })}
            placeholder="Optional" placeholderTextColor={colors.textDim} style={[smallInput, { width: 160 }]} />
        </FieldRow>
        <ChoiceRow label="Gender" value={profile.gender ?? ''} onChange={(g) => g && update('gender', g)}
          options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} />
        <FieldRow label="Age">
          <TextInput defaultValue={profile.age?.toString() ?? ''} keyboardType="number-pad" placeholder="e.g. 30" placeholderTextColor={colors.textDim}
            onEndEditing={(e) => { const v = parseInt(e.nativeEvent.text, 10); update('age', Number.isFinite(v) && v > 5 && v < 110 ? v : null); }}
            style={smallInput} />
        </FieldRow>
      </Group>
      <Text style={[styles.dim, { marginHorizontal: 16 }]}>Bodyweight is taken from the weight log (Today or Health › Weight).</Text>
    </>
  );
}

function WorkoutSection() {
  const { prefs, setPrefs } = usePrefs();
  const { profile, update } = useProfile();
  const r = profile.restSeconds;
  return (
    <>
      <Group title="Rest timer">
        <FieldRow label="Default rest">
          <Step label="−" onPress={() => update('restSeconds', Math.max(15, r - 15))} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', width: 52, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {Math.floor(r / 60)}:{String(r % 60).padStart(2, '0')}
          </Text>
          <Step label="+" onPress={() => update('restSeconds', Math.min(600, r + 15))} />
        </FieldRow>
        <ToggleRow label="Start timer when a set is checked" value={prefs.autoRest} onChange={(v) => setPrefs({ autoRest: v })} />
      </Group>
      <Group title="Logging">
        <ToggleRow label="Pre-fill from last session" sub="Weight and reps start at what you did last time." value={prefs.prefill} onChange={(v) => setPrefs({ prefill: v })} />
        <ToggleRow label="Keep screen on during workouts" value={prefs.keepAwake} onChange={(v) => setPrefs({ keepAwake: v })} />
      </Group>
    </>
  );
}

function AlertsSection() {
  const { prefs, setPrefs } = usePrefs();
  return (
    <Group footer="Alerts play while the app is open. In a browser, sound only works after you have tapped the page once.">
      <ToggleRow label="Vibrate" value={prefs.vibrate} onChange={(v) => { setPrefs({ vibrate: v }); if (v) buzz([0, 200]); }} />
      <ToggleRow label="Sound" value={prefs.sound} onChange={(v) => { setPrefs({ sound: v }); if (v) playBeep(); }} />
      <ToggleRow label="Heads-up 10 s before rest ends" value={prefs.warn10} onChange={(v) => setPrefs({ warn10: v })} />
    </Group>
  );
}

function RemindersSection() {
  const { prefs, setPrefs } = usePrefs();
  const web = Platform.OS === 'web';
  const turnOn = async (patch: Partial<typeof prefs>) => {
    if (!(await ensureNotificationPermission())) {
      showAlert('Notifications are off', web ? 'Reminders work in the installed app, not in the browser preview.' : 'Allow notifications for this app in your phone settings.');
      return;
    }
    setPrefs(patch);
  };
  const w = prefs.remindWorkout, b = prefs.remindWeigh, h = prefs.remindWater;
  return (
    <>
      {web && <Text style={[styles.dim, { marginHorizontal: 16 }]}>Reminders need the installed app. You can set them up here; they start working in the APK.</Text>}
      <Group title="Workouts" footer="Sent on the days your active routine's workouts are scheduled.">
        <ToggleRow label="Workout reminder" value={w.on} onChange={(v) => (v ? turnOn({ remindWorkout: { ...w, on: true } }) : setPrefs({ remindWorkout: { ...w, on: false } }))} />
        {w.on && <TimeRow label="Time" hour={w.hour} minute={w.minute} onChange={(hh, mm) => setPrefs({ remindWorkout: { ...w, hour: hh, minute: mm } })} />}
      </Group>
      <Group title="Bodyweight">
        <ToggleRow label="Morning weigh-in" value={b.on} onChange={(v) => (v ? turnOn({ remindWeigh: { ...b, on: true } }) : setPrefs({ remindWeigh: { ...b, on: false } }))} />
        {b.on && <TimeRow label="Time" hour={b.hour} minute={b.minute} onChange={(hh, mm) => setPrefs({ remindWeigh: { ...b, hour: hh, minute: mm } })} />}
      </Group>
      <Group title="Water">
        <ToggleRow label="Drink reminders" value={h.on} onChange={(v) => (v ? turnOn({ remindWater: { ...h, on: true } }) : setPrefs({ remindWater: { ...h, on: false } }))} />
        {h.on && (
          <ChoiceRow label="Every" value={h.everyHours} onChange={(n) => setPrefs({ remindWater: { ...h, everyHours: n } })}
            options={[1, 2, 3, 4].map((n) => ({ label: `${n} h`, value: n }))} />
        )}
        {h.on && <TimeRow label="From" hour={h.from} minute={0} onChange={(hh) => setPrefs({ remindWater: { ...h, from: Math.min(hh, h.to) } })} />}
        {h.on && <TimeRow label="Until" hour={h.to} minute={0} onChange={(hh) => setPrefs({ remindWater: { ...h, to: Math.max(hh, h.from) } })} />}
      </Group>
    </>
  );
}

function ScheduleSection() {
  const { prefs, setPrefs } = usePrefs();
  return (
    <>
      <Group footer={prefs.schedule === 'weekdays'
        ? 'Workout of the day is the workout assigned to today’s weekday in your active routine.'
        : 'Workout of the day is the next workout in your active routine after the last one you finished, whatever the day.'}>
        <ChoiceRow label="Workout of the day" value={prefs.schedule} onChange={(v) => setPrefs({ schedule: v })}
          options={[{ label: 'By weekday', value: 'weekdays' }, { label: 'Rotation', value: 'rotation' }]} />
        <ChoiceRow label="Week starts on" value={prefs.weekStart} onChange={(v) => setPrefs({ weekStart: v })}
          options={[{ label: 'Monday', value: 1 }, { label: 'Sunday', value: 0 }]} />
      </Group>
      <Button label="Manage routines" variant="ghost" onPress={() => router.navigate('/fitness')} />
    </>
  );
}

function UnitsSection() {
  const { prefs, setPrefs } = usePrefs();
  const { profile, update } = useProfile();
  return (
    <>
      <Group footer="Everything is stored in kg and cm; units only change what you see and type.">
        <ChoiceRow label="Weight" value={profile.unit} onChange={(v) => update('unit', v)} options={[{ label: 'kg', value: 'kg' }, { label: 'lbs', value: 'lbs' }]} />
        <ChoiceRow label="Body measurements" value={prefs.lengthUnit} onChange={(v) => setPrefs({ lengthUnit: v })} options={[{ label: 'cm', value: 'cm' }, { label: 'inches', value: 'in' }]} />
      </Group>
      <Group footer="The app is in English for now.">
        <FieldRow label="Language"><Text style={{ color: colors.textDim, fontSize: 17 }}>English</Text></FieldRow>
      </Group>
    </>
  );
}

function EquipmentSection() {
  const { prefs, setPrefs } = usePrefs();
  const all = prefs.equipment.length >= EQUIPMENT.length;
  const toggle = (e: (typeof EQUIPMENT)[number], v: boolean) =>
    setPrefs({ equipment: v ? [...new Set([...prefs.equipment, e])] : prefs.equipment.filter((x) => x !== e) });
  return (
    <>
      <Group footer="The library and the exercise picker only show exercises you can do with this equipment.">
        <ToggleRow label="Everything" value={all} onChange={(v) => setPrefs({ equipment: v ? [...EQUIPMENT] : ['bodyweight'] })} />
      </Group>
      <Group>
        {EQUIPMENT.map((e) => <ToggleRow key={e} label={EQUIPMENT_LABEL[e]} value={prefs.equipment.includes(e)} onChange={(v) => toggle(e, v)} />)}
      </Group>
    </>
  );
}

const GOAL_FIELDS: { key: keyof Goals; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' }, { key: 'proteinG', label: 'Protein (g)' }, { key: 'fatG', label: 'Fat (g)' },
  { key: 'carbsG', label: 'Carbs (g)' }, { key: 'waterMl', label: 'Water (ml)' }, { key: 'steps', label: 'Steps' }, { key: 'sleepMin', label: 'Sleep (minutes)' },
];

function GoalsSection() {
  const db = useSQLiteContext();
  const { bump } = useDataVersion();
  const [goals, setLocal] = useState<Goals>(DEFAULT_GOALS);
  useEffect(() => { getGoals(db).then(setLocal); }, [db]);
  const change = (key: keyof Goals, text: string) => {
    const v = parseFloat(text.replace(',', '.'));
    const next = { ...goals, [key]: Number.isFinite(v) && v > 0 ? v : goals[key] };
    setLocal(next);
    setGoals(db, next).then(bump);
  };
  const macroKcal = goals.proteinG * 4 + goals.fatG * 9 + goals.carbsG * 4;
  return (
    <Group title="Daily goals" footer={`Your macros add up to ${Math.round(macroKcal)} kcal (protein and carbs 4 kcal/g, fat 9 kcal/g).`}>
      {GOAL_FIELDS.map((f) => (
        <FieldRow key={f.key} label={f.label}>
          <TextInput key={`${f.key}-${goals[f.key]}`} defaultValue={String(goals[f.key])} keyboardType="number-pad"
            onEndEditing={(e) => change(f.key, e.nativeEvent.text)} style={smallInput} />
        </FieldRow>
      ))}
    </Group>
  );
}

function LookSection() {
  const db = useSQLiteContext();
  const { prefs, setPrefs } = usePrefs();
  const resetLayouts = () => showAlert('Reset card layouts?', 'Cards on Today, Nutrition and Health go back to their default order and nothing stays hidden.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: async () => { await db.runAsync("DELETE FROM settings WHERE key LIKE 'layout.%'"); showAlert('Layouts reset'); } },
  ]);
  return (
    <>
      <Group>
        <ChoiceRow label="Theme" value={prefs.theme} onChange={(v) => setPrefs({ theme: v })}
          options={[{ label: 'Dark', value: 'dark' }, { label: 'True black', value: 'black' }]} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 17 }}>Accent color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(Object.keys(ACCENTS) as Accent[]).map((a) => (
              <Pressable key={a} onPress={() => setPrefs({ accent: a })} accessibilityLabel={a}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENTS[a], borderWidth: prefs.accent === a ? 3 : 0, borderColor: colors.text }} />
            ))}
          </View>
        </View>
      </Group>
      <Group title="Home" footer="Use “Edit layout” at the bottom of Today, Nutrition and Health to reorder or hide cards.">
        <Pressable onPress={resetLayouts} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ color: colors.accent, fontSize: 17 }}>Reset card layouts</Text>
        </Pressable>
      </Group>
    </>
  );
}

function DataSection() {
  const db = useSQLiteContext();
  const { bump } = useDataVersion();
  const [withPhotos, setWithPhotos] = useState(false);
  const [paste, setPaste] = useState('');
  const web = Platform.OS === 'web';

  const exportData = async (how: 'share' | 'copy') => {
    const json = await exportAll(db, withPhotos);
    const kb = Math.round(json.length / 1024);
    try {
      if (how === 'share') await Share.share({ message: json, title: 'Tracker Gym backup' });
      else { await Clipboard.setStringAsync(json); showAlert('Backup copied', `${kb} KB copied. Paste it into a note or email to keep it safe.`); }
    } catch {
      showAlert('Could not export', 'Try the other export option.');
    }
  };

  const doImport = () => showAlert('Replace all data?', 'Everything in the app is replaced by the backup. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Replace', style: 'destructive', onPress: async () => {
      try { await importAll(db, paste.trim()); setPaste(''); bump(); showAlert('Backup restored'); }
      catch (e) { showAlert('Import failed', (e as Error).message); }
    } },
  ]);

  const doReset = () => showAlert('Delete all data?', 'Workouts, food, health data and photos are deleted and the starter exercises come back. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete everything', style: 'destructive', onPress: async () => { await resetAll(db); bump(); showAlert('All data deleted'); } },
  ]);

  return (
    <>
      <Group title="Export" footer="A backup is one block of text with all your data. Keep it in notes, email or cloud storage.">
        <ToggleRow label="Include progress photos" sub="Photos make the backup much larger." value={withPhotos} onChange={setWithPhotos} />
        {!web && <Pressable onPress={() => exportData('share')} style={{ paddingHorizontal: 16, paddingVertical: 14 }}><Text style={{ color: colors.accent, fontSize: 17 }}>Share backup…</Text></Pressable>}
        <Pressable onPress={() => exportData('copy')} style={{ paddingHorizontal: 16, paddingVertical: 14 }}><Text style={{ color: colors.accent, fontSize: 17 }}>Copy backup to clipboard</Text></Pressable>
      </Group>
      <Group title="Import">
        <View style={{ padding: 12, gap: 10 }}>
          <TextInput value={paste} onChangeText={setPaste} multiline placeholder="Paste a backup here" placeholderTextColor={colors.textDim}
            style={[inputStyle, { minHeight: 90, textAlignVertical: 'top', fontSize: 13 }]} />
          {!web && <Button label="Paste from clipboard" variant="ghost" onPress={async () => setPaste(await Clipboard.getStringAsync())} />}
          <Button label="Restore backup" onPress={doImport} />
        </View>
      </Group>
      <Group title="Danger zone">
        <Pressable onPress={doReset} style={{ paddingHorizontal: 16, paddingVertical: 14 }}><Text style={{ color: colors.danger, fontSize: 17 }}>Delete all data</Text></Pressable>
      </Group>
    </>
  );
}

function AboutSection() {
  const db = useSQLiteContext();
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const q = async (sql: string) => (await db.getFirstAsync<{ n: number }>(sql))?.n ?? 0;
      setCounts({
        Workouts: await q('SELECT COUNT(*) AS n FROM workouts WHERE ended_at IS NOT NULL AND deleted_at IS NULL'),
        'Sets logged': await q('SELECT COUNT(*) AS n FROM sets WHERE completed_at IS NOT NULL AND deleted_at IS NULL'),
        'Food entries': await q('SELECT COUNT(*) AS n FROM food_entries WHERE deleted_at IS NULL'),
        'Progress photos': await q('SELECT COUNT(*) AS n FROM progress_photos WHERE deleted_at IS NULL'),
      });
    })();
  }, [db]);
  return (
    <>
      <Group>
        <FieldRow label="Version"><Text style={{ color: colors.textDim, fontSize: 17 }}>{APP_VERSION}</Text></FieldRow>
        <FieldRow label="Storage"><Text style={{ color: colors.textDim, fontSize: 17 }}>On this phone</Text></FieldRow>
      </Group>
      <Group title="Your data">
        {Object.entries(counts).map(([k, v]) => (
          <FieldRow key={k} label={k}><Text style={{ color: colors.textDim, fontSize: 17, fontVariant: ['tabular-nums'] }}>{v}</Text></FieldRow>
        ))}
      </Group>
      <Text style={[styles.dim, { marginHorizontal: 16, lineHeight: 20 }]}>
        Tracker Gym keeps everything on this device. Nothing is uploaded and there is no account. Strength standards are approximate; see the
        standards file in the source for where the numbers come from.
      </Text>
    </>
  );
}
