import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSQLiteContext } from 'expo-sqlite';
import { activeWorkouts } from '../repo/routines';
import { useDataVersion } from './DataVersion';
import { usePrefs } from './Prefs';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Asks for notification permission. Returns false on web or when refused. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Keeps scheduled local reminders in line with the settings: workout days
 * (from the active routine), a morning weigh-in, and water through the day.
 * Rebuilt whenever settings or workouts change.
 */
export function ReminderSync() {
  const db = useSQLiteContext();
  const { prefs } = usePrefs();
  const { version } = useDataVersion();
  const { remindWorkout, remindWeigh, remindWater } = prefs;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
        if (!n.identifier.startsWith('rest-')) await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
      if (!remindWorkout.on && !remindWeigh.on && !remindWater.on) return;
      if (!(await ensureNotificationPermission()) || cancelled) return;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: 3 /* AndroidImportance.DEFAULT */ });
      }
      const channelId = 'reminders';
      if (remindWorkout.on) {
        for (const w of await activeWorkouts(db)) {
          for (const day of w.weekdays) {
            await Notifications.scheduleNotificationAsync({
              content: { title: `Time to train: ${w.name}`, body: `${w.exercises.length} exercises planned today.` },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour: remindWorkout.hour, minute: remindWorkout.minute, channelId },
            });
          }
        }
      }
      if (remindWeigh.on) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Morning weigh-in', body: 'Log your bodyweight before breakfast.' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: remindWeigh.hour, minute: remindWeigh.minute, channelId },
        });
      }
      if (remindWater.on) {
        for (let h = remindWater.from; h <= remindWater.to; h += Math.max(1, remindWater.everyHours)) {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Drink some water', body: 'Tap a bottle in the water tracker when you do.' },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: 0, channelId },
          });
        }
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [db, version, remindWorkout, remindWeigh, remindWater]);

  return null;
}
