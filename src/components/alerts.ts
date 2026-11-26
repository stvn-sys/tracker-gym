import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;

/** Short two-tone beep (assets/beep.wav). Fails silently where audio is blocked. */
export function playBeep() {
  try {
    player ??= createAudioPlayer(require('../../assets/beep.wav'));
    player.seekTo(0);
    player.play();
  } catch {
    // Audio not available (e.g. browser without a prior tap); ignore.
  }
}

export function buzz(pattern: number[]) {
  try {
    if (Platform.OS === 'web') (navigator as Navigator & { vibrate?: (p: number[]) => boolean }).vibrate?.(pattern);
    else Vibration.vibrate(pattern);
  } catch {
    // Vibration not supported; ignore.
  }
}

/** Alert at the end of rest (and optionally a short heads-up before it). */
export function restAlert(kind: 'warn' | 'done', opts: { vibrate: boolean; sound: boolean }) {
  if (opts.vibrate) buzz(kind === 'done' ? [0, 400, 200, 400] : [0, 150]);
  if (opts.sound && kind === 'done') playBeep();
}
