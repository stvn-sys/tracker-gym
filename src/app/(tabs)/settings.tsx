import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useProfile } from '../../components/ProfileContext';
import { Card, Chip, SectionTitle, styles } from '../../components/ui';
import { colors } from '../../theme/colors';

export default function Settings() {
  const { profile, update } = useProfile();
  const [age, setAge] = useState(profile.age?.toString() ?? '');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
    </ScrollView>
  );
}
