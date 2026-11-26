import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';
import type { Macros, Meal } from '../domain/meals';

export interface FoodEntry extends Macros { id: string; date: string; meal: Meal; name: string; loggedAt: number }
export type FoodInput = Macros & { name: string };

interface Row {
  id: string; date: string; meal: string; name: string; calories: number;
  protein_g: number; fat_g: number; carbs_g: number; logged_at: number;
}
const map = (r: Row): FoodEntry => ({
  id: r.id, date: r.date, meal: r.meal as Meal, name: r.name, calories: r.calories,
  proteinG: r.protein_g, fatG: r.fat_g, carbsG: r.carbs_g, loggedAt: r.logged_at,
});

export async function foodForDate(db: SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM food_entries WHERE date = ? AND deleted_at IS NULL ORDER BY logged_at', date,
  );
  return rows.map(map);
}

export async function addFood(db: SQLiteDatabase, date: string, meal: Meal, f: FoodInput) {
  const t = now();
  await db.runAsync(
    'INSERT INTO food_entries (id, date, meal, name, calories, protein_g, fat_g, carbs_g, logged_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    newId(), date, meal, f.name.trim() || 'Quick add', f.calories, f.proteinG, f.fatG, f.carbsG, t, t,
  );
}

export async function deleteFood(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE food_entries SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}

/** Distinct recently logged foods (latest version of each name), for one-tap re-adding. */
export async function recentFoods(db: SQLiteDatabase, limit = 12): Promise<FoodInput[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM food_entries WHERE deleted_at IS NULL AND name != 'Quick add'
     AND logged_at = (SELECT MAX(logged_at) FROM food_entries f2 WHERE f2.name = food_entries.name AND f2.deleted_at IS NULL)
     ORDER BY logged_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(map).map(({ name, calories, proteinG, fatG, carbsG }) => ({ name, calories, proteinG, fatG, carbsG }));
}
