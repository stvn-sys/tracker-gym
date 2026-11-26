import type { SQLiteDatabase } from 'expo-sqlite';
import type { Equipment, Muscle } from '../data/muscles';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  builtinKey: string | null;
}

interface Row {
  id: string; name: string; primary_muscle: string; secondary_muscles: string;
  equipment: string; builtin_key: string | null;
}

export const mapExercise = (r: Row): Exercise => ({
  id: r.id,
  name: r.name,
  primaryMuscle: r.primary_muscle as Muscle,
  secondaryMuscles: JSON.parse(r.secondary_muscles),
  equipment: r.equipment as Equipment,
  builtinKey: r.builtin_key,
});

export async function listExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM exercises WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE',
  );
  return rows.map(mapExercise);
}
