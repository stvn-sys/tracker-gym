import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from '../domain/ids';
import { sumMacros, type Macros } from '../domain/meals';

export interface Ingredient extends Macros { name: string }
export interface Recipe { id: string; name: string; servings: number; ingredients: Ingredient[] }
export type RecipeInput = Omit<Recipe, 'id'>;

/** Macros for one serving. */
export function perServing(r: Pick<Recipe, 'servings' | 'ingredients'>): Macros {
  const t = sumMacros(r.ingredients);
  const n = r.servings > 0 ? r.servings : 1;
  return { calories: t.calories / n, proteinG: t.proteinG / n, fatG: t.fatG / n, carbsG: t.carbsG / n };
}

interface Row { id: string; name: string; servings: number; ingredients: string }
const map = (r: Row): Recipe => ({ id: r.id, name: r.name, servings: r.servings, ingredients: JSON.parse(r.ingredients) });

export async function listRecipes(db: SQLiteDatabase): Promise<Recipe[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM recipes WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE');
  return rows.map(map);
}

export async function getRecipe(db: SQLiteDatabase, id: string): Promise<Recipe | null> {
  const r = await db.getFirstAsync<Row>('SELECT * FROM recipes WHERE id = ?', id);
  return r ? map(r) : null;
}

export async function saveRecipe(db: SQLiteDatabase, id: string | null, r: RecipeInput): Promise<string> {
  const t = now();
  if (id) {
    await db.runAsync('UPDATE recipes SET name = ?, servings = ?, ingredients = ?, updated_at = ? WHERE id = ?',
      r.name.trim(), r.servings, JSON.stringify(r.ingredients), t, id);
    return id;
  }
  const nid = newId();
  await db.runAsync('INSERT INTO recipes (id, name, servings, ingredients, updated_at) VALUES (?, ?, ?, ?, ?)',
    nid, r.name.trim(), r.servings, JSON.stringify(r.ingredients), t);
  return nid;
}

export async function deleteRecipe(db: SQLiteDatabase, id: string) {
  const t = now();
  await db.runAsync('UPDATE recipes SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}
