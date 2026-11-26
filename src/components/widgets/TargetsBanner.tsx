import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { goalsSet } from '../../repo/kv';
import { colors } from '../../theme/colors';
import { Icon } from '../Icon';
import { useLoad } from './common';

/** Shown until nutrition goals are set; opens Settings › Nutrition & goals. */
export function TargetsBanner() {
  const db = useSQLiteContext();
  const [set] = useLoad(() => goalsSet(db), [db]);
  if (set !== false) return null;
  return (
    <Pressable onPress={() => router.push({ pathname: '/pref/[section]', params: { section: 'goals' } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentDim }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="target" size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Set nutrition targets</Text>
        <Text style={{ color: colors.textDim }}>Calories and macros, or let them adjust to your weight trend</Text>
      </View>
      <Icon name="chevron" size={18} color={colors.textDim} />
    </Pressable>
  );
}
