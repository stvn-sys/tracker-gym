import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DEFAULT_ADDON_PLATES_KG, DEFAULT_INCREMENT_KG, type Equipment, type Laterality,
} from '../data/equipment';
import { SEED_EXERCISES, type SeedExercise } from '../data/exercises.seed';
import type { Muscle } from '../data/muscles';
import { newId, now } from '../domain/ids';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  /** "+" step during a workout, in kg. */
  incrementKg: number;
  /** Small plates you can add to a stack, in kg. */
  addonPlatesKg: number[];
  laterality: Laterality | null;
  attachment: string | null;
  brandId: string | null;
  seriesId: string | null;
  builtinKey: string | null;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'builtinKey'>;

interface Row {
  id: string; name: string; primary_muscle: string; secondary_muscles: string; equipment: string;
  increment_kg: number; addon_plates: string; laterality: string | null; attachment: string | null;
  brand_id: string | null; series_id: string | null; builtin_key: string | null;
}

export const mapExercise = (r: Row): Exercise => ({
  id: r.id,
  name: r.name,
  primaryMuscle: r.primary_muscle as Muscle,
  secondaryMuscles: JSON.parse(r.secondary_muscles),
  equipment: r.equipment as Equipment,
  incrementKg: r.increment_kg,
  addonPlatesKg: JSON.parse(r.addon_plates),
  laterality: r.laterality as Laterality | null,
  attachment: r.attachment,
  brandId: r.brand_id,
  seriesId: r.series_id,
  builtinKey: r.builtin_key,
});

export function seedToInput(e: SeedExercise): ExerciseInput {
  return {
    name: e.name,
    primaryMuscle: e.primary,
    secondaryMuscles: e.secondary,
    equipment: e.equipment,
    incrementKg: DEFAULT_INCREMENT_KG[e.equipment],
    addonPlatesKg: DEFAULT_ADDON_PLATES_KG[e.equipment] ?? [],
    laterality: e.laterality,
    attachment: e.attachment,
    brandId: null,
    seriesId: null,
  };
}

const COLS = 'name, primary_muscle, secondary_muscles, equipment, increment_kg, addon_plates, laterality, attachment, brand_id, series_id';
const values = (e: ExerciseInput) => [
  e.name.trim(), e.primaryMuscle, JSON.stringify(e.secondaryMuscles), e.equipment, e.incrementKg,
  JSON.stringify(e.addonPlatesKg), e.laterality, e.attachment, e.brandId, e.seriesId,
];

export async function listExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM exercises WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE',
  );
  return rows.map(mapExercise);
}

export async function getExercise(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
  const r = await db.getFirstAsync<Row>('SELECT * FROM exercises WHERE id = ?', id);
  return r ? mapExercise(r) : null;
}

export async function createExercise(db: SQLiteDatabase, e: ExerciseInput, builtinKey: string | null = null) {
  const id = newId();
  await db.runAsync(
    `INSERT INTO exercises (id, ${COLS}, builtin_key, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, ...values(e), builtinKey, now(),
  );
  return id;
}

export const insertSeedExercise = (db: SQLiteDatabase, e: SeedExercise) =>
  createExercise(db, seedToInput(e), e.key);

export async function updateExercise(db: SQLiteDatabase, id: string, e: ExerciseInput) {
  await db.runAsync(
    `UPDATE exercises SET name = ?, primary_muscle = ?, secondary_muscles = ?, equipment = ?, increment_kg = ?,
     addon_plates = ?, laterality = ?, attachment = ?, brand_id = ?, series_id = ?, updated_at = ? WHERE id = ?`,
    ...values(e), now(), id,
  );
}

/** Soft delete so workout history keeps its exercise names. */
export async function deleteExercise(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}

/**
 * Restore defaults: re-creates deleted premade exercises and resets edited ones
 * to their shipped values. Your own exercises and your history are untouched.
 * Ids are kept so past workouts stay linked.
 */
export async function restoreDefaultExercises(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    for (const s of SEED_EXERCISES) {
      const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM exercises WHERE builtin_key = ?', s.key);
      if (row) {
        await updateExercise(db, row.id, seedToInput(s));
        await db.runAsync('UPDATE exercises SET deleted_at = NULL WHERE id = ?', row.id);
      } else {
        await insertSeedExercise(db, s);
      }
    }
  });
}
