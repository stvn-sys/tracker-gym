import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';
import { volumeKg, warmupSets } from '../domain/workout';
import { mapExercise, type Exercise } from './exercises';

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  position: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  isWarmup: boolean;
  completedAt: number | null;
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  position: number;
  note: string | null;
  sets: WorkoutSet[];
  /** Working sets from the last finished session of this exercise (for the "previous" column). */
  previous: WorkoutSet[];
}

export interface Workout {
  id: string;
  routineId: string | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  note: string | null;
}

export interface WorkoutDetail extends Workout {
  exercises: WorkoutExercise[];
}

interface SetRow {
  id: string; workout_exercise_id: string; position: number; weight_kg: number | null;
  reps: number | null; rir: number | null; is_warmup: number; completed_at: number | null;
}
const mapSet = (r: SetRow): WorkoutSet => ({
  id: r.id, workoutExerciseId: r.workout_exercise_id, position: r.position, weightKg: r.weight_kg,
  reps: r.reps, rir: r.rir, isWarmup: !!r.is_warmup, completedAt: r.completed_at,
});

interface WorkoutRow {
  id: string; routine_id: string | null; name: string; started_at: number; ended_at: number | null; note: string | null;
}
const mapWorkout = (r: WorkoutRow): Workout => ({
  id: r.id, routineId: r.routine_id, name: r.name, startedAt: r.started_at, endedAt: r.ended_at, note: r.note,
});

/** Completed working sets of the most recent finished workout that included this exercise. */
export async function lastSessionSets(db: SQLiteDatabase, exerciseId: string, excludeWorkoutId?: string) {
  const we = await db.getFirstAsync<{ id: string }>(
    `SELECT we.id FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND we.deleted_at IS NULL AND w.deleted_at IS NULL AND w.ended_at IS NOT NULL
       AND w.id != ?
       AND EXISTS (SELECT 1 FROM sets s WHERE s.workout_exercise_id = we.id AND s.deleted_at IS NULL
                   AND s.completed_at IS NOT NULL AND s.is_warmup = 0)
     ORDER BY w.started_at DESC LIMIT 1`,
    exerciseId, excludeWorkoutId ?? '',
  );
  if (!we) return [];
  const rows = await db.getAllAsync<SetRow>(
    `SELECT * FROM sets WHERE workout_exercise_id = ? AND deleted_at IS NULL AND is_warmup = 0
     AND completed_at IS NOT NULL ORDER BY position`,
    we.id,
  );
  return rows.map(mapSet);
}

async function insertSet(db: SQLiteDatabase, weId: string, position: number, weightKg: number | null, reps: number | null, isWarmup = false) {
  const id = newId();
  await db.runAsync(
    'INSERT INTO sets (id, workout_exercise_id, position, weight_kg, reps, is_warmup, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, weId, position, weightKg, reps, isWarmup ? 1 : 0, now(),
  );
  return id;
}

/** Create sets for an exercise, pre-filled from its last session. */
async function prefillSets(db: SQLiteDatabase, weId: string, exerciseId: string, targetSets: number, targetReps: number | null) {
  const prev = await lastSessionSets(db, exerciseId);
  const count = Math.max(targetSets, 1);
  for (let i = 0; i < count; i++) {
    const p = prev[i] ?? prev[prev.length - 1];
    await insertSet(db, weId, i, p?.weightKg ?? null, p?.reps ?? targetReps);
  }
}

export async function addExerciseToWorkout(
  db: SQLiteDatabase, workoutId: string, exerciseId: string, targetSets = 3, targetReps: number | null = null,
) {
  const pos = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(MAX(position) + 1, 0) AS n FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL',
    workoutId,
  );
  const weId = newId();
  await db.runAsync(
    'INSERT INTO workout_exercises (id, workout_id, exercise_id, position, updated_at) VALUES (?, ?, ?, ?, ?)',
    weId, workoutId, exerciseId, pos?.n ?? 0, now(),
  );
  await prefillSets(db, weId, exerciseId, targetSets, targetReps);
  return weId;
}

export async function startWorkout(db: SQLiteDatabase, routineId: string | null): Promise<string> {
  const id = newId();
  await db.withTransactionAsync(async () => {
    const routine = routineId
      ? await db.getFirstAsync<{ name: string }>('SELECT name FROM routines WHERE id = ?', routineId)
      : null;
    const t = now();
    await db.runAsync(
      'INSERT INTO workouts (id, routine_id, name, started_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      id, routineId, routine?.name ?? 'Workout', t, t,
    );
    if (!routineId) return;
    const items = await db.getAllAsync<{ exercise_id: string; target_sets: number; target_reps: number }>(
      `SELECT re.exercise_id, re.target_sets, re.target_reps FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = ? AND re.deleted_at IS NULL AND e.deleted_at IS NULL ORDER BY re.position`,
      routineId,
    );
    for (const it of items) await addExerciseToWorkout(db, id, it.exercise_id, it.target_sets, it.target_reps);
  });
  return id;
}

export async function getActiveWorkout(db: SQLiteDatabase): Promise<Workout | null> {
  const r = await db.getFirstAsync<WorkoutRow>(
    'SELECT * FROM workouts WHERE ended_at IS NULL AND deleted_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );
  return r ? mapWorkout(r) : null;
}

export async function getWorkout(db: SQLiteDatabase, id: string): Promise<WorkoutDetail | null> {
  const w = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', id);
  if (!w) return null;
  const wes = await db.getAllAsync<{ we_id: string; position: number; note: string | null } & Parameters<typeof mapExercise>[0]>(
    `SELECT we.id AS we_id, we.position, we.note, e.* FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ? AND we.deleted_at IS NULL ORDER BY we.position`,
    id,
  );
  const sets = await db.getAllAsync<SetRow>(
    `SELECT s.* FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
     WHERE we.workout_id = ? AND s.deleted_at IS NULL ORDER BY s.is_warmup DESC, s.position`,
    id,
  );
  const exercises: WorkoutExercise[] = [];
  for (const r of wes) {
    const exercise = mapExercise(r);
    exercises.push({
      id: r.we_id,
      exercise,
      position: r.position,
      note: r.note,
      sets: sets.filter((s) => s.workout_exercise_id === r.we_id).map(mapSet),
      previous: await lastSessionSets(db, exercise.id, id),
    });
  }
  return { ...mapWorkout(w), exercises };
}

export async function updateSet(db: SQLiteDatabase, setId: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'completedAt'>>) {
  const cols: string[] = [];
  const vals: (number | null)[] = [];
  if ('weightKg' in patch) { cols.push('weight_kg = ?'); vals.push(patch.weightKg ?? null); }
  if ('reps' in patch) { cols.push('reps = ?'); vals.push(patch.reps ?? null); }
  if ('rir' in patch) { cols.push('rir = ?'); vals.push(patch.rir ?? null); }
  if ('completedAt' in patch) { cols.push('completed_at = ?'); vals.push(patch.completedAt ?? null); }
  if (!cols.length) return;
  await db.runAsync(`UPDATE sets SET ${cols.join(', ')}, updated_at = ? WHERE id = ?`, ...vals, now(), setId);
}

/** Adds a working set copying the last one. */
export async function addSet(db: SQLiteDatabase, weId: string) {
  const last = await db.getFirstAsync<SetRow>(
    'SELECT * FROM sets WHERE workout_exercise_id = ? AND deleted_at IS NULL AND is_warmup = 0 ORDER BY position DESC LIMIT 1',
    weId,
  );
  await insertSet(db, weId, (last?.position ?? -1) + 1, last?.weight_kg ?? null, last?.reps ?? null);
}

export async function deleteSet(db: SQLiteDatabase, setId: string) {
  const t = now();
  await db.runAsync('UPDATE sets SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, setId);
}

/** Inserts a warm-up ramp based on the first working set's weight. Returns false if there is no weight yet. */
export async function addWarmups(db: SQLiteDatabase, we: WorkoutExercise): Promise<boolean> {
  const firstWorking = we.sets.find((s) => !s.isWarmup && s.weightKg);
  if (!firstWorking?.weightKg) return false;
  const ramp = warmupSets(firstWorking.weightKg, we.exercise.incrementKg);
  await db.withTransactionAsync(async () => {
    for (const [i, w] of ramp.entries()) await insertSet(db, we.id, i, w.weightKg, w.reps, true);
  });
  return ramp.length > 0;
}

/** Swap keeps the number of sets; unfinished sets are re-filled from the new exercise's history. */
export async function swapExercise(db: SQLiteDatabase, we: WorkoutExercise, newExerciseId: string) {
  await db.withTransactionAsync(async () => {
    const t = now();
    await db.runAsync('UPDATE workout_exercises SET exercise_id = ?, updated_at = ? WHERE id = ?', newExerciseId, t, we.id);
    const prev = await lastSessionSets(db, newExerciseId);
    const working = we.sets.filter((s) => !s.isWarmup && !s.completedAt);
    for (const [i, s] of working.entries()) {
      const p = prev[i] ?? prev[prev.length - 1];
      await updateSet(db, s.id, { weightKg: p?.weightKg ?? null, reps: p?.reps ?? s.reps });
    }
    for (const s of we.sets.filter((x) => x.isWarmup && !x.completedAt)) await deleteSet(db, s.id);
  });
}

export async function setExerciseNote(db: SQLiteDatabase, weId: string, note: string) {
  await db.runAsync('UPDATE workout_exercises SET note = ?, updated_at = ? WHERE id = ?', note.trim() || null, now(), weId);
}

export async function removeWorkoutExercise(db: SQLiteDatabase, weId: string) {
  const t = now();
  await db.runAsync('UPDATE workout_exercises SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, weId);
}

/** Finish: drops sets that were never checked off, and exercises left with no sets. */
export async function finishWorkout(db: SQLiteDatabase, workoutId: string) {
  await db.withTransactionAsync(async () => {
    const t = now();
    await db.runAsync(
      `UPDATE sets SET deleted_at = ?, updated_at = ? WHERE completed_at IS NULL AND deleted_at IS NULL
       AND workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
      t, t, workoutId,
    );
    await db.runAsync(
      `UPDATE workout_exercises SET deleted_at = ?, updated_at = ? WHERE workout_id = ? AND deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM sets s WHERE s.workout_exercise_id = workout_exercises.id AND s.deleted_at IS NULL)`,
      t, t, workoutId,
    );
    await db.runAsync('UPDATE workouts SET ended_at = ?, updated_at = ? WHERE id = ?', t, t, workoutId);
  });
}

export async function discardWorkout(db: SQLiteDatabase, workoutId: string) {
  const t = now();
  await db.runAsync('UPDATE workouts SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, workoutId);
}

export interface WorkoutSummary extends Workout {
  exerciseNames: string[];
  volumeKg: number;
  setCount: number;
}

export async function listHistory(db: SQLiteDatabase): Promise<WorkoutSummary[]> {
  const ws = await db.getAllAsync<WorkoutRow>(
    'SELECT * FROM workouts WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at DESC',
  );
  const rows = await db.getAllAsync<{ workout_id: string; name: string; we_id: string } & SetRow>(
    `SELECT we.workout_id, e.name, we.id AS we_id, s.* FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     JOIN workouts w ON w.id = we.workout_id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id AND s.deleted_at IS NULL
     WHERE we.deleted_at IS NULL AND w.ended_at IS NOT NULL AND w.deleted_at IS NULL
     ORDER BY we.position`,
  );
  return ws.map((w) => {
    const mine = rows.filter((r) => r.workout_id === w.id);
    const sets = mine.filter((r) => r.id).map(mapSet);
    return {
      ...mapWorkout(w),
      exerciseNames: [...new Set(mine.map((r) => r.name))],
      volumeKg: volumeKg(sets),
      setCount: sets.filter((s) => !s.isWarmup).length,
    };
  });
}

/** Every completed working set of an exercise with its workout date (for 1RM history / rankings). */
export async function exerciseSetHistory(db: SQLiteDatabase, exerciseId: string) {
  const rows = await db.getAllAsync<SetRow & { started_at: number; workout_id: string }>(
    `SELECT s.*, w.started_at, w.id AS workout_id FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND s.deleted_at IS NULL AND we.deleted_at IS NULL AND w.deleted_at IS NULL
       AND s.completed_at IS NOT NULL AND s.is_warmup = 0
     ORDER BY w.started_at`,
    exerciseId,
  );
  return rows.map((r) => ({ ...mapSet(r), startedAt: r.started_at, workoutId: r.workout_id }));
}

