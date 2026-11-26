# Backlog — for the next version (do when the user asks for a new version)

## Sleep (from Health Connect / Fitbit via Google Health)
- **Calculated sleep score (0–100)** from the synced sleep data, since Health Connect
  does not share Fitbit's own score. Base it on: total sleep vs goal, time in deep and
  REM, time awake / number of wake-ups, sleep efficiency (asleep ÷ in bed), and
  bedtime consistency vs the previous nights. Explain the breakdown in the app.
- **Import all sleep data Health Connect provides**, not just duration: bedtime and
  wake time, time in bed, stages (awake, light, deep, REM, out of bed) with minutes
  per stage, wake-ups, efficiency, naps as separate sessions. Show a stage timeline
  (hypnogram) and per-stage trends on the Sleep card/history.
- Store sessions and stages in their own tables (not just health_metrics) so the
  score can be recalculated if the formula changes.

## Possibly
- Resting heart rate from raw HeartRate samples if Fitbit does not write
  RestingHeartRate (lowest sustained overnight value). Ask the user first.

## Training
- **Plate calculator**: shows automatically on bar exercises (based on the bar
  type's weight) — plates per side for the entered weight.
- **Rest timer on the lock screen**: ongoing notification with countdown, so the
  app can be closed between sets.

## Nutrition
- **Self-adjusting macro targets**: weekly update from the averaged weight trend
  (not single weigh-ins) vs the goal rate.
- **Saved meals / recipes**: log a usual meal in one tap.
- **Copy yesterday's meals** (or one meal) to today.

## Health
- **Recovery score**: sleep (score) + resting HR + HRV vs personal baseline;
  suggests push / normal / take it easy today. Pairs with the sleep score.
- **Progress photo comparison**: side-by-side or slider between two dates.

## Layout / UX (inspired by another tracker app — ideas only, no copied look)
- **Date strip** on Today and Nutrition: scrollable days + "Today" button to view
  and log past/future days.
- **Macro progress bars** at top of Nutrition: Energy/Protein/Carbs/Fat as
  "eaten / target" with %.
- **"Set targets" banner** shown only while nutrition goals aren't set.
- **Half-width cards**: allow two small cards side by side in the page layouts.
- **Summary chips on workouts**: exercises, sets, estimated time.
- **Cardio tracking**: minutes today / this week (Health Connect exercise sessions
  + manual entry), optional scheduled cardio.
- **⋯ menu per meal**: copy (to today/another day), save as meal, clear.
