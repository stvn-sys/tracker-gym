import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BarTypesEditor, BrandsEditor, ListEditor } from '../../components/EquipmentEditors';
import { CommitInput } from '../../components/CommitInput';
import { useDataVersion } from '../../components/DataVersion';
import { showAlert } from '../../components/Dialog';
import { usePrefs } from '../../components/Prefs';
import { useProfile } from '../../components/ProfileContext';
import { ensureNotificationPermission } from '../../components/Reminders';
import { ChoiceRow, Group, NavRow, Step, TimeRow, ToggleRow } from '../../components/SettingsUI';
import { Button, inputStyle, styles } from '../../components/ui';
import { playBeep, buzz } from '../../components/alerts';
import { APP_VERSION } from '../../data/appInfo';
import {
  connectHealthConnect, grantedHealthTypes, HC_TYPES, healthConnectStatus, openHealthConnectSettings, syncHealthConnect, type HcStatus,
} from '../../repo/healthConnect';
import { BAR_TYPES, BAR_WEIGHTS_KG, EQUIPMENT, EQUIPMENT_LABEL, VARIANTS, supportsBrand, supportsPulleys, PULLEY_OPTIONS, type Equipment } from '../../data/equipment';
import { runAutoMacros } from '../../repo/autoMacros';
import { exportAll, importAll, resetAll } from '../../repo/backup';
import { DEFAULT_GOALS, getGoals, setGoals, type Goals } from '../../repo/kv';
import { latestBodyweightKg, logBodyweight } from '../../repo/bodyweight';
import { formatBodyweight, fromDisplay } from '../../domain/units';
import { ACCENTS, colors, type Accent } from '../../theme/colors';

const TITLES: Record<string, string> = {
  profile: 'Profile', workout: 'Workout', gyms: 'Gyms', attachments: 'Equipment & attachments', health: 'Health Connect', alerts: 'Timer alerts', reminders: 'Reminders', schedule: 'Plan & schedule',
  units: 'Units & language', goals: 'Nutrition & goals', look: 'Look & Home', data: 'Data & backup', about: 'About',
};

export default function PrefSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { gap: 22, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: TITLES[section] ?? (section?.startsWith('eq-') ? EQUIPMENT_LABEL[section.slice(3) as Equipment] : 'Settings') }} />
      {section?.startsWith('eq-') && <EquipmentTypeSection eq={section.slice(3) as Equipment} />}
      {section === 'profile' && <ProfileSection />}
      {section === 'workout' && <WorkoutSection />}
      {section === 'gyms' && <GymsSection />}
      {section === 'health' && <HealthConnectSection />}
      {section === 'attachments' && <AttachmentsSection />}
      {section === 'alerts' && <AlertsSection />}
      {section === 'reminders' && <RemindersSection />}
      {section === 'schedule' && <ScheduleSection />}
      {section === 'units' && <UnitsSection />}
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
  const db = useSQLiteContext();
  const { bump } = useDataVersion();
  const { prefs, setPrefs } = usePrefs();
  const { profile, update } = useProfile();
  const [bw, setBw] = useState<number | null | undefined>(undefined);
  useEffect(() => { latestBodyweightKg(db).then(setBw); }, [db]);
  return (
    <>
      <Group footer="Gender, age and weight are used to rank your lifts against strength standards.">
        <FieldRow label="Name">
          <CommitInput initial={prefs.name} onCommit={(t) => setPrefs({ name: t.trim() })}
            placeholder="Optional" placeholderTextColor={colors.textDim} style={[smallInput, { width: 160 }]} />
        </FieldRow>
        <ChoiceRow label="Gender" value={profile.gender ?? ''} onChange={(g) => g && update('gender', g)}
          options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} />
        <FieldRow label={`Weight (${profile.unit})`}>
          {bw !== undefined && (
            <CommitInput key={`bw-${bw}-${profile.unit}`} initial={bw == null ? '' : formatBodyweight(bw, profile.unit, false)} keyboardType="decimal-pad"
              placeholder="e.g. 80" placeholderTextColor={colors.textDim} style={smallInput}
              onCommit={async (t) => {
                const v = parseFloat(t.replace(',', '.'));
                if (!Number.isFinite(v) || v <= 0) return;
                const kg = Math.round(fromDisplay(v, profile.unit) * 100) / 100;
                await logBodyweight(db, kg);
                setBw(kg);
                bump();
              }} />
          )}
        </FieldRow>
        <FieldRow label="Age">
          <CommitInput initial={profile.age?.toString() ?? ''} keyboardType="number-pad" placeholder="e.g. 30" placeholderTextColor={colors.textDim}
            onCommit={(t) => { const v = parseInt(t, 10); update('age', Number.isFinite(v) && v > 5 && v < 110 ? v : null); }}
            style={smallInput} />
        </FieldRow>
      </Group>
      <Text style={[styles.dim, { marginHorizontal: 16 }]}>Changing your weight here logs it for today, the same as the Weight card. Your history is in Health › Weight.</Text>
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

function HealthConnectSection() {
  const db = useSQLiteContext();
  const { bump } = useDataVersion();
  const { prefs, setPrefs } = usePrefs();
  const [status, setStatus] = useState<HcStatus | null>(null);
  const [granted, setGranted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const hcPrefs = prefs.healthConnect;

  useEffect(() => {
    healthConnectStatus().then(async (s) => {
      setStatus(s);
      if (s === 'available') setGranted(await grantedHealthTypes().catch(() => []));
    });
  }, []);

  const sync = async () => {
    setBusy(true);
    setResult('');
    try {
      const n = await syncHealthConnect(db, 30);
      setPrefs({ healthConnect: { enabled: true, lastSync: Date.now() } });
      bump();
      const total = Object.values(n).reduce((a, b) => a + b, 0);
      setResult(total ? `Synced ${total} day-values from the last 30 days.` : 'Connected, but Health Connect has no data for the last 30 days yet.');
    } catch {
      setResult('Sync failed. Open Health Connect and check that Kinetic has access.');
    } finally { setBusy(false); }
  };

  const connect = async () => {
    try {
      const g = await connectHealthConnect();
      setGranted(g);
      if (!g.length) { showAlert('No access given', 'Allow Kinetic in Health Connect to read your data, then try again.'); return; }
      await sync();
    } catch {
      showAlert('Could not open Health Connect', 'Make sure the Health Connect app is installed and up to date.');
    }
  };

  if (status === null) return null;
  if (status === 'unsupported') {
    return <Text style={[styles.dim, { marginHorizontal: 16, lineHeight: 20 }]}>Health Connect is an Android feature and works in the installed app on your phone, not in the browser preview.</Text>;
  }
  if (status !== 'available') {
    return (
      <Group footer="Health Connect is built into Android 14 and newer. On older Android versions, install it from the Play Store.">
        <FieldRow label="Health Connect"><Text style={{ color: colors.textDim }}>{status === 'update-required' ? 'Needs an update' : 'Not installed'}</Text></FieldRow>
      </Group>
    );
  }
  const last = hcPrefs.lastSync ? new Date(hcPrefs.lastSync).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';
  return (
    <>
      <Group footer="Samsung Health, Google Fit and most watches share their data through Health Connect. Synced values replace manual entries for the same day.">
        {hcPrefs.enabled && granted.length > 0 ? (
          <>
            <ToggleRow label="Sync automatically" sub="When the app opens, at most every 15 minutes (last 7 days)." value={hcPrefs.enabled}
              onChange={(v) => setPrefs({ healthConnect: { ...hcPrefs, enabled: v } })} />
            <FieldRow label="Last sync"><Text style={{ color: colors.textDim }}>{last}</Text></FieldRow>
            <Pressable onPress={sync} disabled={busy} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text style={{ color: colors.accent, fontSize: 17 }}>{busy ? 'Syncing…' : 'Sync last 30 days now'}</Text>
            </Pressable>
          </>
        ) : (
          <View style={{ padding: 12 }}><Button label="Connect Health Connect" onPress={connect} /></View>
        )}
      </Group>
      {result ? <Text style={[styles.dim, { marginHorizontal: 16 }]}>{result}</Text> : null}
      <Group title="Data">
        {HC_TYPES.map((t) => (
          <FieldRow key={t.record} label={t.label}>
            <Text style={{ color: granted.includes(t.record) ? colors.success : colors.textDim }}>{granted.includes(t.record) ? 'Allowed' : 'Not allowed'}</Text>
          </FieldRow>
        ))}
      </Group>
      <Text style={[styles.dim, { marginHorizontal: 16, lineHeight: 20 }]}>
        Sleep score is calculated by this app from your sleep stages. To change what Kinetic can read, open Health Connect.
      </Text>
      <Button label="Open Health Connect" variant="ghost" onPress={openHealthConnectSettings} />
    </>
  );
}

function GymsSection() {
  const { prefs, setPrefs } = usePrefs();
  return (
    <>
      <ListEditor items={prefs.gyms} onChange={(gyms) => setPrefs({ gyms })} placeholder="Add a gym, e.g. Basic-Fit Centrum" />
      <Text style={[styles.dim, { marginHorizontal: 16 }]}>
        With two or more gyms, you pick one when you start a workout. With one, it is used automatically. Tap a name to rename it.
      </Text>
    </>
  );
}

function AttachmentsSection() {
  const { prefs } = usePrefs();
  const sub = (e: Equipment) => {
    const n = (prefs.attachmentsByEq[e] ?? []).length;
    const parts = [e === 'barbell' && `${prefs.barTypes.length} bars`, supportsBrand(e) && 'Brands', n ? `${n} attachments` : 'No attachments'];
    return parts.filter(Boolean).join(' · ');
  };
  return (
    <>
      <Group footer="Pick an equipment type to edit its sub-types and attachments. Types without attachments don't show an attachment field when you create an exercise.">
        {EQUIPMENT.map((e) => (
          <NavRow key={e} label={EQUIPMENT_LABEL[e]} value={sub(e)} onPress={() => router.push({ pathname: '/pref/[section]', params: { section: `eq-${e}` } })} />
        ))}
      </Group>
    </>
  );
}

function EquipmentTypeSection({ eq }: { eq: Equipment }) {
  const { prefs, setPrefs } = usePrefs();
  const list = prefs.attachmentsByEq[eq] ?? [];
  const setList = (next: string[]) => setPrefs({ attachmentsByEq: { ...prefs.attachmentsByEq, [eq]: next } });
  return (
    <>
      {eq === 'barbell' && (
        <>
          <Text style={styles.section}>Bar types</Text>
          <BarTypesEditor />
          <Button label="Restore default bar types" variant="ghost" onPress={() => setPrefs({ barTypes: [...BAR_TYPES], barWeights: { ...BAR_WEIGHTS_KG } })} />
        </>
      )}
      {supportsBrand(eq) && <BrandsEditor />}
      {supportsPulleys(eq) && <Text style={styles.dim}>Pulleys: {PULLEY_OPTIONS.join(', ')} (chosen per exercise).</Text>}
      {VARIANTS[eq] && <Text style={styles.dim}>Types: {VARIANTS[eq]!.join(', ')}. These decide how weight is logged, so they are fixed.</Text>}
      <Text style={styles.section}>Attachments</Text>
      <ListEditor items={list} onChange={setList} placeholder="Add an attachment" />
      <Text style={[styles.dim, { marginHorizontal: 16 }]}>
        {list.length ? 'Tap a name to rename it. Exercises that already use a removed attachment keep it.' : `No attachments: ${EQUIPMENT_LABEL[eq]} exercises won't show an attachment field.`}
      </Text>
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

const GOAL_FIELDS: { key: keyof Goals; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' }, { key: 'proteinG', label: 'Protein (g)' }, { key: 'fatG', label: 'Fat (g)' },
  { key: 'carbsG', label: 'Carbs (g)' }, { key: 'waterMl', label: 'Water (ml)' }, { key: 'steps', label: 'Steps' }, { key: 'sleepMin', label: 'Sleep (minutes)' }, { key: 'cardioMinWeek', label: 'Cardio (min/week)' },
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
  const { prefs, setPrefs } = usePrefs();
  const a = prefs.autoMacros;
  const [busy, setBusy] = useState(false);
  const runNow = async () => {
    setBusy(true);
    const r = await runAutoMacros(db, a.rateKgWeek);
    setBusy(false);
    if (!r) { showAlert('Not enough data yet', 'Needs at least 5 weigh-ins over 10+ days and 7 days of logged food in the last 3 weeks.'); return; }
    setPrefs({ autoMacros: { ...a, lastRun: Date.now(), tdee: r.tdee, slopeKgWeek: r.slopeKgPerWeek } });
    setLocal(await getGoals(db));
    bump();
    showAlert('Targets updated', `Estimated maintenance ${r.tdee} kcal · trend ${r.slopeKgPerWeek > 0 ? '+' : ''}${r.slopeKgPerWeek} kg/week → ${r.targets.calories} kcal.`);
  };
  const RATES = [-0.75, -0.5, -0.25, 0, 0.25, 0.5];
  return (
    <>
    <Group title="Adaptive targets" footer={a.on
      ? `Every week the app compares what you ate with your weight trend (not single weigh-ins) and moves calories toward your goal, at most 250 kcal at a time. Protein stays as you set it.${a.tdee ? ` Last estimate: maintenance ${a.tdee} kcal, trend ${a.slopeKgWeek} kg/week.` : ''}`
      : 'Turn on to let calories and macros follow your weight trend each week.'}>
      <ToggleRow label="Adjust targets weekly" value={a.on} onChange={(on) => setPrefs({ autoMacros: { ...a, on, lastRun: on ? a.lastRun : null } })} />
      {a.on && (
        <ChoiceRow label="Goal (kg per week)" value={a.rateKgWeek} onChange={(rateKgWeek) => setPrefs({ autoMacros: { ...a, rateKgWeek } })}
          options={RATES.map((r) => ({ value: r, label: r === 0 ? '0' : `${r > 0 ? '+' : '−'}${Math.abs(r)}` }))} />
      )}
      {a.on && <View style={{ padding: 12 }}><Button label={busy ? 'Calculating…' : 'Recalculate now'} variant="ghost" onPress={runNow} /></View>}
    </Group>
    <Group title="Daily goals" footer={`Your macros add up to ${Math.round(macroKcal)} kcal (protein and carbs 4 kcal/g, fat 9 kcal/g).`}>
      {GOAL_FIELDS.map((f) => (
        <FieldRow key={f.key} label={f.label}>
          <CommitInput key={`${f.key}-${goals[f.key]}`} initial={String(goals[f.key])} keyboardType="number-pad"
            onCommit={(t) => change(f.key, t)} style={smallInput} />
        </FieldRow>
      ))}
    </Group>
    </>
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
      if (how === 'share') await Share.share({ message: json, title: 'Kinetic backup' });
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
        Kinetic keeps everything on this device. Nothing is uploaded and there is no account.
      </Text>
    </>
  );
}
