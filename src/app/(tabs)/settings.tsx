import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Icon, type IconName } from '../../components/Icon';
import { usePrefs } from '../../components/Prefs';
import { useProfile } from '../../components/ProfileContext';
import { Group, NavRow } from '../../components/SettingsUI';
import { styles } from '../../components/ui';
import { useLoad } from '../../components/widgets/common';
import { APP_VERSION } from '../../data/appInfo';
import { getGoals } from '../../repo/kv';
import { latestBodyweightKg } from '../../repo/bodyweight';
import { formatBodyweight } from '../../domain/units';
import { colors, TILE } from '../../theme/colors';


interface RowDef { section: string; label: string; icon: IconName; tile: string; value: string; keywords: string }

export default function Settings() {
  const db = useSQLiteContext();
  const { prefs } = usePrefs();
  const { profile } = useProfile();
  const [query, setQuery] = useState('');
  const [goals] = useLoad(() => getGoals(db), [db]);
  const [bw] = useLoad(() => latestBodyweightKg(db), [db]);

  const rest = `${Math.floor(profile.restSeconds / 60)}:${String(profile.restSeconds % 60).padStart(2, '0')}`;
  const reminders = [prefs.remindWorkout.on && 'Workout', prefs.remindWeigh.on && 'Weigh-in', prefs.remindWater.on && 'Water'].filter(Boolean);
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

  const groups: RowDef[][] = [
    [
      { section: 'workout', label: 'Workout', icon: 'play', tile: TILE.green, value: `${rest} rest · ${prefs.autoRest ? 'Auto timer' : 'Manual timer'}`, keywords: 'rest timer prefill previous awake' },
      { section: 'gyms', label: 'Gyms', icon: 'pin', tile: TILE.gray, value: prefs.gyms.length ? (prefs.gyms.length === 1 ? prefs.gyms[0] : `${prefs.gyms.length} gyms`) : 'None', keywords: 'gym location place' },
      { section: 'attachments', label: 'Equipment & attachments', icon: 'link', tile: TILE.gray, value: '', keywords: 'equipment cable attachment rope handle bar brand series machine' },
      { section: 'alerts', label: 'Timer alerts', icon: 'speaker', tile: TILE.pink, value: [prefs.sound && 'Sound', prefs.vibrate && 'Vibrate'].filter(Boolean).join(' · ') || 'Silent', keywords: 'sound vibrate vibration beep' },
      { section: 'reminders', label: 'Reminders', icon: 'bell', tile: TILE.red, value: reminders.length ? reminders.join(' · ') : 'Off', keywords: 'notification notify water weigh' },
    ],
    [
      { section: 'health', label: 'Health Connect', icon: 'heart', tile: TILE.gray, value: prefs.healthConnect.enabled ? 'On' : 'Off', keywords: 'samsung health google fit steps sleep heart sync watch' },
      { section: 'schedule', label: 'Plan & schedule', icon: 'calendar', tile: TILE.orange, value: `${prefs.schedule === 'rotation' ? 'Rotation' : 'Weekdays'} · ${prefs.weekStart === 1 ? 'Mon' : 'Sun'}`, keywords: 'routine rotation week start day' },
      { section: 'units', label: 'Units & language', icon: 'ruler', tile: TILE.cyan, value: `${profile.unit} · ${prefs.lengthUnit} · English`, keywords: 'kg lbs pounds cm inches language' },
      { section: 'goals', label: 'Nutrition & goals', icon: 'target', tile: TILE.teal, value: goals ? `${goals.calories} kcal` : '', keywords: 'calories protein fat carbs water steps sleep macros' },
    ],
    [
      { section: 'look', label: 'Look & Home', icon: 'palette', tile: TILE.purple, value: `${cap(prefs.theme)} · ${cap(prefs.accent)}`, keywords: 'theme color accent dark black layout home' },
    ],
    [
      { section: 'data', label: 'Data & backup', icon: 'folder', tile: TILE.blue, value: '', keywords: 'export import backup restore reset delete' },
      { section: 'about', label: 'About', icon: 'info', tile: TILE.gray, value: `v${APP_VERSION}`, keywords: 'version privacy' },
    ],
  ];

  const q = query.trim().toLowerCase();
  const visible = groups
    .map((g) => g.filter((r) => !q || `${r.label} ${r.keywords} ${r.value}`.toLowerCase().includes(q)))
    .filter((g) => g.length);
  const open = (section: string) => router.push({ pathname: '/pref/[section]', params: { section } });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { gap: 22, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12 }}>
        <Icon name="search" size={18} color={colors.textDim} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search…" placeholderTextColor={colors.textDim}
          style={{ flex: 1, minWidth: 0, color: colors.text, fontSize: 17, paddingVertical: 10 }} />
      </View>

      {!q && (
        <Pressable onPress={() => open('profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="person" size={30} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{prefs.name || 'This phone'}</Text>
            <Text style={{ color: colors.textDim, fontSize: 14 }}>
              {[profile.gender && cap(profile.gender), profile.age && `${profile.age} y`, bw && formatBodyweight(bw, profile.unit)].filter(Boolean).join(' · ') || 'Set up your profile'}
            </Text>
          </View>
          <Icon name="chevron" size={18} color={colors.textDim} />
        </Pressable>
      )}

      {visible.map((g, i) => (
        <Group key={i}>
          {g.map((r) => <NavRow key={r.section} icon={r.icon} tile={r.tile} label={r.label} value={r.value} onPress={() => open(r.section)} />)}
        </Group>
      ))}
      {visible.length === 0 && <Text style={[styles.dim, { textAlign: 'center' }]}>No settings match “{query}”.</Text>}

      <Text style={{ color: colors.textDim, textAlign: 'center', fontSize: 13 }}>Kinetic v{APP_VERSION}</Text>
    </ScrollView>
  );
}
