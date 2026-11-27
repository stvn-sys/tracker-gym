import { Text, View } from 'react-native';
import { equipmentLines } from '../data/equipment';
import type { Brand } from '../repo/brands';
import type { Exercise } from '../repo/exercises';
import { colors } from '../theme/colors';

/** Exercise equipment in three levels: equipment / sub-equipment / attachment, one per line. */
export function EquipmentText({ exercise, brands, prefix, size = 13 }: { exercise: Exercise; brands: Brand[]; prefix?: string; size?: number }) {
  const l = equipmentLines(exercise, brands);
  return (
    <View>
      <Text style={{ color: colors.textDim, fontSize: size }} numberOfLines={1}>{prefix ? `${prefix} · ` : ''}{l.equipment}</Text>
      {l.sub && <Text style={{ color: colors.textDim, fontSize: size }} numberOfLines={1}>{l.sub}</Text>}
      {l.attachment && <Text style={{ color: colors.textDim, fontSize: size }} numberOfLines={1}>{l.attachment}</Text>}
    </View>
  );
}
