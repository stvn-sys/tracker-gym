import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useDataVersion } from '../components/DataVersion';
import { DEFAULT_GOALS, getGoals, setGoals, type Goals } from '../repo/kv';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useProfile } from '../components/ProfileContext';
import { Card, Chip, SectionTitle, styles } from '../components/ui';
import { colors } from '../theme/colors';

export default function Settings() {
  const { profile, update } = useProfile();
  const [age, setAge] = useState(profile.age?.toString() ?? '');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SectionTitle>Units</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="kg" active={profile.unit === 'kg'} onPress={() => update('unit', 'kg')} />
        <Chip label="lbs" active={profile.unit === 'lbs'} onPress={() => update('unit', 'lbs')} />
      </View>

      <SectionTitle>Profile</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={styles.dim}>Gender (for strength standards)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Male" active={profile.gender === 'male'} onPress={() => update('gender', 'male')} />
          <Chip label="Female" active={profile.gender === 'female'} onPress={() => update('gender', 'female')} />
        </View>
        <Text style={styles.dim}>Age</Text>
        <TextInput
          value={age || (profile.age?.toString() ?? '')}
          onChangeText={setAge}
          onEndEditing={() => update('age', age ? Number(age) : null)}
          keyboardType="number-pad"
          placeholder="e.g. 30"
          placeholderTextColor={colors.textDim}
          style={{ color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12, fontSize: 16 }}
        />
        <Text style={styles.dim}>Bodyweight comes from the bodyweight log on Home.</Text>
      </Card>

      <SectionTitle>Rest timer</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {[60, 90, 120, 180, 240].map((s) => (
          <Chip key={s} label={`${s / 60} min`} active={profile.restSeconds === s} onPress={() => update('restSeconds', s)} />
        ))}
      </View>
      <SectionTitle>Daily goals</SectionTitle>
      <GoalsEditor />
    </ScrollView>
  );
}

const GOAL_FIELDS: { key: keyof Goals; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'proteinG', label: 'Protein (g)' },
  { key: 'fatG', label: 'Fat (g)' },
  { key: 'carbsG', label: 'Carbs (g)' },
  { key: 'waterMl', label: 'Water (ml)' },
  { key: 'steps', label: 'Steps' },
  { key: 'sleepMin', label: 'Sleep (minutes)' },
];

function GoalsEditor() {
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

  return (
    <Card style={{ gap: 10 }}>
      {GOAL_FIELDS.map((f) => (
        <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.text, { flex: 1 }]}>{f.label}</Text>
          <TextInput
            defaultValue={String(goals[f.key])}
            key={`${f.key}-${goals[f.key]}`}
            onEndEditing={(e) => change(f.key, e.nativeEvent.text)}
            keyboardType="number-pad"
            style={{ color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: 110, textAlign: 'right', fontSize: 16 }}
          />
        </View>
      ))}
    </Card>
  );
}
