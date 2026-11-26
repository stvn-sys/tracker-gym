/**
 * Versioned migrations. Append new entries; never edit old ones.
 *
 * Sync-readiness conventions (every syncable table):
 *  - `id` TEXT UUID primary key (globally unique, generated on device)
 *  - `updated_at` INTEGER ms epoch, bumped on every write
 *  - `deleted_at` INTEGER ms epoch, soft delete (tombstone) instead of DELETE
 * Weights are always stored in kilograms.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL,
    increment_kg REAL NOT NULL DEFAULT 2.5,
    addon_plates TEXT NOT NULL DEFAULT '[]',
    laterality TEXT,
    attachment TEXT,
    brand_id TEXT,
    series_id TEXT,
    builtin_key TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_exercises_builtin ON exercises(builtin_key);

  CREATE TABLE machine_brands (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE machine_series (
    id TEXT PRIMARY KEY NOT NULL,
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_series_brand ON machine_series(brand_id);

  CREATE TABLE routines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    weekdays TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE routine_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 3,
    target_reps INTEGER NOT NULL DEFAULT 8,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_re_routine ON routine_exercises(routine_id);

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT,
    name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    note TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_workouts_started ON workouts(started_at);

  CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    note TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_we_workout ON workout_exercises(workout_id);
  CREATE INDEX idx_we_exercise ON workout_exercises(exercise_id);

  CREATE TABLE sets (
    id TEXT PRIMARY KEY NOT NULL,
    workout_exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    weight_kg REAL,
    reps INTEGER,
    rir INTEGER,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_sets_we ON sets(workout_exercise_id);

  CREATE TABLE bodyweight_logs (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE UNIQUE INDEX idx_bw_date ON bodyweight_logs(date);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
  // 2: food, water, health metrics
  `
  CREATE TABLE food_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    logged_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_food_date ON food_entries(date);

  CREATE TABLE water_logs (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    ml REAL NOT NULL,
    logged_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_water_date ON water_logs(date);

  CREATE TABLE water_bottles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    ml REAL NOT NULL,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  -- One value per metric per day (steps, sleep, vitals). See src/data/metrics.ts.
  CREATE TABLE health_metrics (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    value REAL NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE UNIQUE INDEX idx_metric_type_date ON health_metrics(type, date);
  `,
  // 3: one "cable" equipment type with a pulley count, recipes, progress photos
  `
  ALTER TABLE exercises ADD COLUMN pulleys INTEGER;
  UPDATE exercises SET equipment = 'cable', pulleys = 2 WHERE equipment = 'cable_2';
  UPDATE exercises SET equipment = 'cable', pulleys = 1 WHERE equipment = 'cable_1';
  UPDATE exercises SET attachment = 'D-handle' WHERE attachment = 'Single D-handle';
  UPDATE exercises SET attachment = 'Bar' WHERE attachment = 'Straight bar';
  UPDATE machine_brands SET name = 'gym80' WHERE name = 'Gym80';

  CREATE TABLE recipes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    servings REAL NOT NULL DEFAULT 1,
    ingredients TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE progress_photos (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    pose TEXT NOT NULL,
    uri TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_photos_date ON progress_photos(date);
  `,
];
