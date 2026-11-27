/**
 * Rest timer on the lock screen: a sticky "Resting until …" notification plus a
 * scheduled "Rest over" alert, so the app can be closed between sets.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ensureNotificationPermission } from './Reminders';

export const REST_IDS = ['rest-now', 'rest-end'];
let channelReady = false;
let categoryReady = false;

export async function showRest(endsAt: number, exercise: string, alert: { sound: boolean; vibrate: boolean }) {
  if (Platform.OS === 'web') return;
  try {
    if (!(await ensureNotificationPermission())) return;
    if (Platform.OS === 'android' && !channelReady) {
      await Notifications.setNotificationChannelAsync('rest', { name: 'Rest timer', importance: 4 /* HIGH */, vibrationPattern: [0, 400, 200, 400] });
      await Notifications.setNotificationChannelAsync('rest-live', { name: 'Rest timer (ongoing)', importance: 2 /* LOW: silent */ });
      channelReady = true;
    }
    if (!categoryReady) {
      await Notifications.setNotificationCategoryAsync('rest', [
        { identifier: 'rest-skip', buttonTitle: 'Skip rest', options: { opensAppToForeground: false } },
        { identifier: 'rest-add30', buttonTitle: '+30 s', options: { opensAppToForeground: false } },
      ]);
      categoryReady = true;
    }
    await clearRest();
    const until = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await Notifications.scheduleNotificationAsync({
      identifier: 'rest-now',
      content: { title: `Resting until ${until}`, body: `Next: ${exercise}`, sticky: true, autoDismiss: false, categoryIdentifier: 'rest' },
      trigger: Platform.OS === 'android' ? { channelId: 'rest-live' } : null,
    });
    const seconds = Math.max(1, Math.round((endsAt - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      identifier: 'rest-end',
      content: { title: 'Rest over', body: `Time for your next set: ${exercise}`, sound: alert.sound, vibrate: alert.vibrate ? [0, 400, 200, 400] : undefined },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'rest' },
    });
  } catch { /* notifications unavailable */ }
}

export async function clearRest() {
  if (Platform.OS === 'web') return;
  try {
    for (const id of REST_IDS) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await Notifications.dismissNotificationAsync(id);
    }
  } catch { /* ignore */ }
}

/** Calls back when "Skip rest" or "+30 s" is tapped on the rest notification. */
export function onRestAction(cb: (action: 'skip' | 'add30') => void) {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    if (r.actionIdentifier === 'rest-skip') cb('skip');
    else if (r.actionIdentifier === 'rest-add30') cb('add30');
  });
  return () => sub.remove();
}
