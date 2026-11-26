import type { SQLiteDatabase } from 'expo-sqlite';
import { SEED_EXERCISES, SEED_ROUTINES } from '../data/exercises.seed';
import { newId, now } from '../domain/ids';

export async function seedIfEmpty(db: SQLiteDatabase) {
  const seeded = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'seeded'");
  if (seeded) return;

  await db.withTransactionAsync(async () => {
    const t = now();
    const idByKey: Record<string, string> = {};
    for (const e of SEED_EXERCISES) {
      const id = newId();
      idByKey[e.key] = id;
      await db.runAsync(
        'INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, equipment, builtin_key, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, e.name, e.primary, JSON.stringify(e.secondary), e.equipment, e.key, t,
      );
    }
    for (const [i, r] of SEED_ROUTINES.entries()) {
      const rid = newId();
      await db.runAsync(
        'INSERT INTO routines (id, name, position, weekdays, updated_at) VALUES (?, ?, ?, ?, ?)',
        rid, r.name, i, JSON.stringify(r.weekdays), t,
      );
      for (const [j, [key, sets, reps]] of r.exercises.entries()) {
        await db.runAsync(
          'INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          newId(), rid, idByKey[key], j, sets, reps, t,
        );
      }
    }
    await db.runAsync("INSERT INTO settings (key, value, updated_at) VALUES ('seeded', '1', ?)", t);
  });
}
