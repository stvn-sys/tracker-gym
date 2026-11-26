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
