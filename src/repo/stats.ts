import type { SQLiteDatabase } from 'expo-sqlite';
import type { Muscle } from '../data/muscles';
import type { Sex } from '../data/strengthStandards';
import {
  exercisePercentile, groupScores, muscleScores, percentileToRank, standardFor,
  type ExerciseScore, type Rank,
} from '../domain/ranking';
import { epley } from '../domain/workout';
import { loadMode } from '../data/equipment';
import { mapExercise, type Exercise } from './exercises';

export const RECENT_DAYS = 90;
const MAX_REPS_FOR_E1RM = 12;

export interface RankedExercise extends ExerciseScore {
  exercise: Exercise;
  e1rmKg: number;
  rank: Rank;
}

export interface StatsResult {
  exercises: RankedExercise[];
  muscles: Record<Muscle, number | null>;
  groups: { group: string; percentile: number | null }[];
  overall: Rank | null;
}

interface Row {
  weight_kg: number | null;
  reps: number;
  ex_id: string;
}

/** Load used for e1RM: bodyweight is added for pull-ups/dips etc. */
/**
 * How a set's weight turns into load: external weight, or bodyweight plus/minus
 * the logged weight (weighted / assisted bodyweight exercises).
 */
type LoadKind = 'external' | 'bw+' | 'bw-';
function loadKind(ex: { equipment: Exercise['equipment']; variant: string | null } | undefined, addBodyweight: boolean): LoadKind {
  if (!ex) return addBodyweight ? 'bw+' : 'external';
  const mode = loadMode(ex);
  if (mode === 'assisted') return 'bw-';
  if (ex.equipment === 'bodyweight' || addBodyweight) return 'bw+';
  return 'external';
}

function setE1rm(weightKg: number | null, reps: number, bodyweightKg: number, kind: LoadKind): number {
  if (reps > MAX_REPS_FOR_E1RM) return 0;
  const w = weightKg ?? 0;
  const load = kind === 'bw+' ? bodyweightKg + w : kind === 'bw-' ? bodyweightKg - w : w;
  return epley(load, reps);
}

export async function computeStats(
  db: SQLiteDatabase, profile: { sex: Sex; age: number | null; bodyweightKg: number },
): Promise<StatsResult> {
  const since = Date.now() - RECENT_DAYS * 86_400_000;
  const exRows = await db.getAllAsync<Parameters<typeof mapExercise>[0]>(
    'SELECT * FROM exercises WHERE deleted_at IS NULL AND builtin_key IS NOT NULL',
  );
  const exercises = new Map(exRows.map((r) => [r.id, mapExercise(r)]));
  const sets = await db.getAllAsync<Row>(
    `SELECT s.weight_kg, s.reps, we.exercise_id AS ex_id FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE s.deleted_at IS NULL AND we.deleted_at IS NULL AND w.deleted_at IS NULL
       AND s.completed_at IS NOT NULL AND s.is_warmup = 0 AND s.reps > 0 AND w.started_at >= ?`,
    since,
  );

  const best = new Map<string, number>();
  for (const s of sets) {
    const ex = exercises.get(s.ex_id);
    const std = standardFor(ex?.builtinKey);
    if (!ex || !std) continue;
    const e = setE1rm(s.weight_kg, s.reps, profile.bodyweightKg, loadKind(ex, !!std.addBodyweight));
    if (e > (best.get(ex.id) ?? 0)) best.set(ex.id, e);
  }

  const ranked: RankedExercise[] = [];
  for (const [id, e1rmKg] of best) {
    const exercise = exercises.get(id)!;
    const std = standardFor(exercise.builtinKey)!;
    const percentile = exercisePercentile(std, e1rmKg, profile);
    ranked.push({
      exerciseId: id, exercise, e1rmKg, percentile, rank: percentileToRank(percentile),
      primary: exercise.primaryMuscle, secondary: exercise.secondaryMuscles,
    });
  }
  ranked.sort((a, b) => b.percentile - a.percentile);

  const muscles = muscleScores(ranked);
  const groups = groupScores(muscles);
  const ms = Object.values(muscles).filter((v): v is number => v != null);
  const overall = ms.length ? percentileToRank(ms.reduce((a, b) => a + b, 0) / ms.length) : null;
  return { exercises: ranked, muscles, groups, overall };
}

/** Best e1RM per workout for an exercise, oldest first (for the progress graph). */
export async function e1rmHistory(db: SQLiteDatabase, exerciseId: string, bodyweightKg: number | null) {
  const ex = await db.getFirstAsync<{ builtin_key: string | null; equipment: Exercise['equipment']; variant: string | null }>(
    'SELECT builtin_key, equipment, variant FROM exercises WHERE id = ?', exerciseId);
  const kind = loadKind(ex ?? undefined, !!standardFor(ex?.builtin_key)?.addBodyweight);
  const rows = await db.getAllAsync<{ weight_kg: number | null; reps: number; started_at: number; workout_id: string }>(
    `SELECT s.weight_kg, s.reps, w.started_at, w.id AS workout_id FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND s.deleted_at IS NULL AND we.deleted_at IS NULL AND w.deleted_at IS NULL
       AND s.completed_at IS NOT NULL AND s.is_warmup = 0 AND s.reps > 0
     ORDER BY w.started_at`,
    exerciseId,
  );
  const byWorkout = new Map<string, { t: number; e1rm: number }>();
  for (const r of rows) {
    const e = setE1rm(r.weight_kg, r.reps, bodyweightKg ?? 0, kind);
    if (e <= 0) continue;
    const cur = byWorkout.get(r.workout_id);
    if (!cur || e > cur.e1rm) byWorkout.set(r.workout_id, { t: r.started_at, e1rm: e });
  }
  return [...byWorkout.values()];
}

export interface SessionStat {
  t: number;
  /** Best estimated 1RM of the session (kg). */
  e1rm: number;
  /** Heaviest working set (kg). */
  topKg: number;
  /** Total weight × reps of working sets (kg). */
  volumeKg: number;
  /** Most reps in one working set. */
  bestReps: number;
}

/** One row per finished session of an exercise, oldest first. */
export async function exerciseSessions(db: SQLiteDatabase, exerciseId: string, bodyweightKg: number | null): Promise<SessionStat[]> {
  const ex = await db.getFirstAsync<{ builtin_key: string | null; equipment: Exercise['equipment']; variant: string | null }>(
    'SELECT builtin_key, equipment, variant FROM exercises WHERE id = ?', exerciseId);
  const kind = loadKind(ex ?? undefined, !!standardFor(ex?.builtin_key)?.addBodyweight);
  const rows = await db.getAllAsync<{ weight_kg: number | null; reps: number; started_at: number; workout_id: string }>(
    `SELECT s.weight_kg, s.reps, w.started_at, w.id AS workout_id FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND s.deleted_at IS NULL AND we.deleted_at IS NULL AND w.deleted_at IS NULL
       AND w.ended_at IS NOT NULL AND s.completed_at IS NOT NULL AND s.is_warmup = 0 AND s.reps > 0
     ORDER BY w.started_at`,
    exerciseId,
  );
  return groupSessions(rows, (w, r) => setE1rm(w, r, bodyweightKg ?? 0, kind));
}

function groupSessions(
  rows: { weight_kg: number | null; reps: number; started_at: number; workout_id: string }[],
  e1rmOf: (weightKg: number | null, reps: number) => number,
): SessionStat[] {
  const by = new Map<string, SessionStat>();
  for (const r of rows) {
    const cur = by.get(r.workout_id) ?? { t: r.started_at, e1rm: 0, topKg: 0, volumeKg: 0, bestReps: 0 };
    const w = r.weight_kg ?? 0;
    cur.e1rm = Math.max(cur.e1rm, e1rmOf(r.weight_kg, r.reps));
    cur.topKg = Math.max(cur.topKg, w);
    cur.volumeKg += w * r.reps;
    cur.bestReps = Math.max(cur.bestReps, r.reps);
    by.set(r.workout_id, cur);
  }
  return [...by.values()];
}

/** Best e1RM per session for every exercise at once (for library sparklines). */
export async function allE1rmSeries(db: SQLiteDatabase): Promise<Map<string, number[]>> {
  const rows = await db.getAllAsync<{ weight_kg: number | null; reps: number; started_at: number; workout_id: string; exercise_id: string }>(
    `SELECT s.weight_kg, s.reps, w.started_at, w.id AS workout_id, we.exercise_id FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE s.deleted_at IS NULL AND we.deleted_at IS NULL AND w.deleted_at IS NULL AND w.ended_at IS NOT NULL
       AND s.completed_at IS NOT NULL AND s.is_warmup = 0 AND s.reps > 0 AND s.weight_kg > 0
     ORDER BY w.started_at`,
  );
  const perExercise = new Map<string, typeof rows>();
  for (const r of rows) perExercise.set(r.exercise_id, [...(perExercise.get(r.exercise_id) ?? []), r]);
  const out = new Map<string, number[]>();
  for (const [id, list] of perExercise) {
    out.set(id, groupSessions(list, (w, r) => setE1rm(w, r, 0, 'external')).map((s) => s.e1rm).filter((v) => v > 0));
  }
  return out;
}
