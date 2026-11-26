import type { SQLiteDatabase } from 'expo-sqlite';

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  position: number;
  targetSets: number;
  targetReps: number;
}

export interface Routine {
  id: string;
  name: string;
  position: number;
  weekdays: number[];
  exercises: RoutineExercise[];
}

export async function listRoutines(db: SQLiteDatabase): Promise<Routine[]> {
  const routines = await db.getAllAsync<{ id: string; name: string; position: number; weekdays: string }>(
    'SELECT id, name, position, weekdays FROM routines WHERE deleted_at IS NULL ORDER BY position',
  );
  const items = await db.getAllAsync<{
    id: string; routine_id: string; exercise_id: string; name: string;
    position: number; target_sets: number; target_reps: number;
  }>(
    `SELECT re.id, re.routine_id, re.exercise_id, e.name, re.position, re.target_sets, re.target_reps
     FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id
     WHERE re.deleted_at IS NULL ORDER BY re.position`,
  );
  return routines.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position,
    weekdays: JSON.parse(r.weekdays),
    exercises: items
      .filter((i) => i.routine_id === r.id)
      .map((i) => ({
        id: i.id, exerciseId: i.exercise_id, exerciseName: i.name,
        position: i.position, targetSets: i.target_sets, targetReps: i.target_reps,
      })),
  }));
}

export const routineForWeekday = (routines: Routine[], weekday: number) =>
  routines.find((r) => r.weekdays.includes(weekday)) ?? null;
