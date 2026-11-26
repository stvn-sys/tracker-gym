import type { SQLiteDatabase } from 'expo-sqlite';
import { SEED_BRANDS } from '../data/equipment';
import { SEED_EXERCISES, SEED_ROUTINE_NAME, SEED_ROUTINES } from '../data/exercises.seed';
import { newId, now } from '../domain/ids';
import { insertSeedExercise, restoreDefaultExercises } from '../repo/exercises';
import { getActiveWorkout, startWorkout } from '../repo/workouts';

const flag = async (db: SQLiteDatabase, key: string) =>
  !!(await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key));
const setFlag = (db: SQLiteDatabase, key: string) =>
  db.runAsync("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, '1', ?)", key, now());

/** First launch: machine brands and the premade exercise library. */
export async function seedIfEmpty(db: SQLiteDatabase) {
  if (await flag(db, 'seeded')) return;
  await db.withTransactionAsync(async () => {
    const t = now();
    for (const b of SEED_BRANDS) {
      const bid = newId();
      await db.runAsync('INSERT INTO machine_brands (id, name, updated_at) VALUES (?, ?, ?)', bid, b.name, t);
      for (const s of b.series) {
        await db.runAsync('INSERT INTO machine_series (id, brand_id, name, updated_at) VALUES (?, ?, ?, ?)', newId(), bid, s, t);
      }
    }
    for (const e of SEED_EXERCISES) await insertSeedExercise(db, e);
    await setFlag(db, 'seeded');
    await setFlag(db, 'seededV3'); // a fresh install already has the plan's library
  });
}

/** Default water bottles (added once, editable). */
export async function seedV2(db: SQLiteDatabase) {
  if (await flag(db, 'seededV2')) return;
  await db.withTransactionAsync(async () => {
    const t = now();
    for (const [i, [name, ml]] of ([['Glass', 250], ['Bottle', 500], ['Large bottle', 750], ['1 L bottle', 1000]] as const).entries()) {
      await db.runAsync('INSERT INTO water_bottles (id, name, ml, position, updated_at) VALUES (?, ?, ?, ?, ?)', newId(), name, ml, i, t);
    }
    await setFlag(db, 'seededV2');
  });
}

/**
 * One-time switch to the user's Workout_Plan.xlsx:
 *  - library: every exercise is removed (soft delete, so past workouts keep their
 *    names) and the plan's exercises are added/restored;
 *  - routines: existing routines are replaced by "Workout Plan" (Full Body, Upper, Lower);
 *  - a Full Body workout is left open to try everything out.
 */
export async function seedV3(db: SQLiteDatabase) {
  if (!(await flag(db, 'seededV3'))) {
    const t = now();
    await db.runAsync('UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL', t, t);
    await restoreDefaultExercises(db);
    await setFlag(db, 'seededV3');
  }
  if (await flag(db, 'seededPlan')) return;

  let fullBodyId: string | null = null;
  await db.withTransactionAsync(async () => {
    const t = now();
    await db.runAsync('UPDATE routine_groups SET deleted_at = ?, is_active = 0, updated_at = ? WHERE deleted_at IS NULL', t, t);
    await db.runAsync('UPDATE routines SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL', t, t);
    const gid = newId();
    await db.runAsync('INSERT INTO routine_groups (id, name, position, is_active, updated_at) VALUES (?, ?, 0, 1, ?)', gid, SEED_ROUTINE_NAME, t);
    for (const [i, r] of SEED_ROUTINES.entries()) {
      const rid = newId();
      if (r.name === 'Full Body') fullBodyId = rid;
      await db.runAsync(
        'INSERT INTO routines (id, name, position, weekdays, group_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        rid, r.name, i, JSON.stringify(r.weekdays), gid, t,
      );
      for (const [j, [key, sets]] of r.exercises.entries()) {
        const ex = await db.getFirstAsync<{ id: string }>('SELECT id FROM exercises WHERE builtin_key = ? AND deleted_at IS NULL', key);
        if (!ex) continue;
        await db.runAsync(
          'INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, target_reps_max, updated_at) VALUES (?, ?, ?, ?, ?, 8, 12, ?)',
          newId(), rid, ex.id, j, sets, t,
        );
      }
    }
    await setFlag(db, 'seededPlan');
  });
  if (fullBodyId && !(await getActiveWorkout(db))) await startWorkout(db, fullBodyId);
}
