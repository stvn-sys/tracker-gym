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
  // 4: one "machine" type; trap bar/landmine -> barbell, kettlebell -> dumbbell;
  //    routines become "workouts" grouped into routine groups (programs)
  `
  UPDATE exercises SET equipment = 'machine' WHERE equipment IN ('machine_pin', 'machine_plate');
  UPDATE exercises SET equipment = 'barbell' WHERE equipment IN ('trap_bar', 'landmine');
  UPDATE exercises SET equipment = 'dumbbell' WHERE equipment = 'kettlebell';
  UPDATE exercises SET name = 'Dumbbell Swing' WHERE builtin_key = 'kb_swing' AND name = 'Kettlebell Swing';

  CREATE TABLE routine_groups (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  ALTER TABLE routines ADD COLUMN group_id TEXT;
  INSERT INTO routine_groups (id, name, position, is_active, updated_at)
    VALUES ('default-group', 'My Routine', 0, 1, CAST(strftime('%s','now') AS INTEGER) * 1000);
  UPDATE routines SET group_id = 'default-group';
  `,
  // 5: per-exercise rest time, supersets in workouts and routine workouts
  `
  ALTER TABLE exercises ADD COLUMN rest_seconds INTEGER;
  ALTER TABLE workout_exercises ADD COLUMN superset_id TEXT;
  ALTER TABLE routine_exercises ADD COLUMN superset_id TEXT;
  `,
  // 6: "Bar" with bar types (EZ bar becomes a bar type), rep ranges in routine workouts
  `
  ALTER TABLE exercises ADD COLUMN bar_type TEXT;
  UPDATE exercises SET equipment = 'barbell', bar_type = 'EZ bar' WHERE equipment = 'ez_bar';
  UPDATE exercises SET bar_type = 'Trap bar' WHERE builtin_key = 'trap_bar_deadlift';
  UPDATE exercises SET bar_type = 'Olympic barbell' WHERE equipment = 'barbell' AND bar_type IS NULL;
  ALTER TABLE routine_exercises ADD COLUMN target_reps_max INTEGER;
  `,
  // 7: remembered notes per exercise, gym per workout
  `
  ALTER TABLE exercises ADD COLUMN notes TEXT;
  ALTER TABLE workouts ADD COLUMN gym TEXT;
  `,
  // 8: variant for bodyweight/band exercises (weighted, assisted, ...)
  `
  ALTER TABLE exercises ADD COLUMN variant TEXT;
  `,
  // 9: full sleep sessions (stages as JSON) and cardio sessions
  `
  CREATE TABLE sleep_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    wake_date TEXT NOT NULL,
    stages TEXT NOT NULL DEFAULT '[]',
    source TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_sleep_wake ON sleep_sessions(wake_date);
  CREATE TABLE cardio_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    minutes REAL NOT NULL,
    kind TEXT NOT NULL,
    kcal REAL,
    distance_m REAL,
    source TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_cardio_date ON cardio_sessions(date);
  `,
  // 10: machine loading type + starting weight; "upper back" became rhomboids
  `
  ALTER TABLE exercises ADD COLUMN machine_load TEXT;
  ALTER TABLE exercises ADD COLUMN start_weight_kg REAL;
  UPDATE exercises SET primary_muscle = 'rhomboids' WHERE primary_muscle = 'upper_back';
  UPDATE exercises SET secondary_muscles = REPLACE(secondary_muscles, '"upper_back"', '"rhomboids"');
  `,
];
