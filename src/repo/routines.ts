import type { SQLiteDatabase } from 'expo-sqlite';
import type { Muscle } from '../data/muscles';
import { newId, now } from '../domain/ids';

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  position: number;
  targetSets: number;
  targetReps: number;
}

/** A "workout" in the UI: one training day (e.g. Upper), with weekdays. */
export interface Routine {
  id: string;
  groupId: string | null;
  name: string;
  position: number;
  weekdays: number[];
  exercises: RoutineExercise[];
}

export async function listRoutines(db: SQLiteDatabase): Promise<Routine[]> {
  const routines = await db.getAllAsync<{ id: string; name: string; position: number; weekdays: string; group_id: string | null }>(
    'SELECT id, name, position, weekdays, group_id FROM routines WHERE deleted_at IS NULL ORDER BY position',
  );
  const items = await db.getAllAsync<{
    id: string; routine_id: string; exercise_id: string; name: string; primary_muscle: string; secondary_muscles: string;
    position: number; target_sets: number; target_reps: number;
  }>(
    `SELECT re.id, re.routine_id, re.exercise_id, e.name, e.primary_muscle, e.secondary_muscles, re.position, re.target_sets, re.target_reps
     FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id
     WHERE re.deleted_at IS NULL AND e.deleted_at IS NULL ORDER BY re.position`,
  );
  return routines.map((r) => ({
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    position: r.position,
    weekdays: JSON.parse(r.weekdays),
    exercises: items
      .filter((i) => i.routine_id === r.id)
      .map((i) => ({
        id: i.id, exerciseId: i.exercise_id, exerciseName: i.name,
        primaryMuscle: i.primary_muscle as Muscle, secondaryMuscles: JSON.parse(i.secondary_muscles),
        position: i.position, targetSets: i.target_sets, targetReps: i.target_reps,
      })),
  }));
}

/** First routine (in list order) assigned to this weekday (0 = Sunday). */
export const routineForWeekday = (routines: Routine[], weekday: number) =>
  routines.find((r) => r.weekdays.includes(weekday)) ?? null;

export interface RoutineInput {
  groupId?: string | null;
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
    const groupId = input.groupId ?? (await activeGroupId(db));
    await db.runAsync(
      'INSERT INTO routines (id, name, position, weekdays, group_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      id, input.name.trim(), pos?.n ?? 0, JSON.stringify(input.weekdays), groupId, now(),
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

/* ---------- Routine groups ("Routines" in the UI): a set of workouts ---------- */

export interface RoutineGroup { id: string; name: string; position: number; isActive: boolean; workouts: Routine[] }

export async function listGroups(db: SQLiteDatabase): Promise<RoutineGroup[]> {
  const groups = await db.getAllAsync<{ id: string; name: string; position: number; is_active: number }>(
    'SELECT id, name, position, is_active FROM routine_groups WHERE deleted_at IS NULL ORDER BY position',
  );
  const workouts = await listRoutines(db);
  return groups.map((g) => ({
    id: g.id, name: g.name, position: g.position, isActive: !!g.is_active,
    workouts: workouts.filter((w) => w.groupId === g.id),
  }));
}

export async function getGroup(db: SQLiteDatabase, id: string) {
  return (await listGroups(db)).find((g) => g.id === id) ?? null;
}

export async function activeGroupId(db: SQLiteDatabase): Promise<string | null> {
  const r = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM routine_groups WHERE deleted_at IS NULL ORDER BY is_active DESC, position LIMIT 1',
  );
  return r?.id ?? null;
}

/** Workouts of the active routine (used for "workout of the day"). */
export async function activeWorkouts(db: SQLiteDatabase): Promise<Routine[]> {
  const gid = await activeGroupId(db);
  const all = await listRoutines(db);
  return gid ? all.filter((w) => w.groupId === gid) : all;
}

export async function createGroup(db: SQLiteDatabase, name: string): Promise<string> {
  const id = newId();
  const pos = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(position) + 1, 0) AS n FROM routine_groups WHERE deleted_at IS NULL');
  const hasActive = await db.getFirstAsync<{ id: string }>('SELECT id FROM routine_groups WHERE deleted_at IS NULL AND is_active = 1');
  await db.runAsync('INSERT INTO routine_groups (id, name, position, is_active, updated_at) VALUES (?, ?, ?, ?, ?)',
    id, name.trim(), pos?.n ?? 0, hasActive ? 0 : 1, now());
  return id;
}

export async function renameGroup(db: SQLiteDatabase, id: string, name: string) {
  await db.runAsync('UPDATE routine_groups SET name = ?, updated_at = ? WHERE id = ?', name.trim(), now(), id);
}

export async function setActiveGroup(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routine_groups SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END, updated_at = ?', id, t);
  });
}

/** Deletes the routine and its workouts (past workout history is kept). */
export async function deleteGroup(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routine_groups SET deleted_at = ?, updated_at = ?, is_active = 0 WHERE id = ?', t, t, id);
    await db.runAsync('UPDATE routines SET deleted_at = ?, updated_at = ? WHERE group_id = ? AND deleted_at IS NULL', t, t, id);
  });
}

export async function reorderGroups(db: SQLiteDatabase, ids: string[]) {
  await db.withTransactionAsync(async () => {
    const t = now();
    for (const [i, id] of ids.entries()) await db.runAsync('UPDATE routine_groups SET position = ?, updated_at = ? WHERE id = ?', i, t, id);
  });
}
