import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';

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
     WHERE re.deleted_at IS NULL AND e.deleted_at IS NULL ORDER BY re.position`,
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

/** First routine (in list order) assigned to this weekday (0 = Sunday). */
export const routineForWeekday = (routines: Routine[], weekday: number) =>
  routines.find((r) => r.weekdays.includes(weekday)) ?? null;

export interface RoutineInput {
  name: string;
  weekdays: number[];
  exercises: { exerciseId: string; targetSets: number; targetReps: number }[];
}

export async function getRoutine(db: SQLiteDatabase, id: string): Promise<Routine | null> {
  return (await listRoutines(db)).find((r) => r.id === id) ?? null;
}

async function writeItems(db: SQLiteDatabase, routineId: string, items: RoutineInput['exercises']) {
  const t = now();
  await db.runAsync(
    'UPDATE routine_exercises SET deleted_at = ?, updated_at = ? WHERE routine_id = ? AND deleted_at IS NULL',
    t, t, routineId,
  );
  for (const [i, it] of items.entries()) {
    await db.runAsync(
      'INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      newId(), routineId, it.exerciseId, i, it.targetSets, it.targetReps, t,
    );
  }
}

export async function createRoutine(db: SQLiteDatabase, input: RoutineInput): Promise<string> {
  const id = newId();
  await db.withTransactionAsync(async () => {
    const pos = await db.getFirstAsync<{ n: number }>(
      'SELECT COALESCE(MAX(position) + 1, 0) AS n FROM routines WHERE deleted_at IS NULL',
    );
    await db.runAsync(
      'INSERT INTO routines (id, name, position, weekdays, updated_at) VALUES (?, ?, ?, ?, ?)',
      id, input.name.trim(), pos?.n ?? 0, JSON.stringify(input.weekdays), now(),
    );
    await writeItems(db, id, input.exercises);
  });
  return id;
}

export async function updateRoutine(db: SQLiteDatabase, id: string, input: RoutineInput) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE routines SET name = ?, weekdays = ?, updated_at = ? WHERE id = ?',
      input.name.trim(), JSON.stringify(input.weekdays), now(), id,
    );
    await writeItems(db, id, input.exercises);
  });
}

export async function deleteRoutine(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE routines SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}

/** Saves a new order (array of routine ids, top to bottom). */
export async function reorderRoutines(db: SQLiteDatabase, ids: string[]) {
  await db.withTransactionAsync(async () => {
    const t = now();
    for (const [i, id] of ids.entries()) {
      await db.runAsync('UPDATE routines SET position = ?, updated_at = ? WHERE id = ?', i, t, id);
    }
  });
}
