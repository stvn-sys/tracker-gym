import { mixHex } from '../domain/volume';

/**
 * App palette. Neutral, near-black surfaces with one accent color the user picks
 * (Settings › Look). `colors` is mutated in place by applyTheme() at startup and
 * when the look changes; the app is then re-rendered so every screen picks it up.
 */
export const colors = {
  bg: '#0E0E11',
  surface: '#1B1B20',
  surfaceAlt: '#26262D',
  border: '#2E2E36',
  text: '#F5F5F7',
  textDim: '#8E8E98',
  accent: '#4FA8FF',
  accentDim: '#1D3048',
  danger: '#FF5A5F',
  success: '#34C77B',
};

export const ACCENTS = {
  blue: '#4FA8FF', green: '#34C77B', orange: '#FF9F43', purple: '#A78BFA', pink: '#FF6B9A', teal: '#2DD4BF',
} as const;
export type Accent = keyof typeof ACCENTS;
export type ThemeName = 'dark' | 'black';

const BASES: Record<ThemeName, Pick<typeof colors, 'bg' | 'surface' | 'surfaceAlt' | 'border'>> = {
  dark: { bg: '#0E0E11', surface: '#1B1B20', surfaceAlt: '#26262D', border: '#2E2E36' },
  black: { bg: '#000000', surface: '#131316', surfaceAlt: '#1E1E23', border: '#26262C' },
};

export function applyTheme(theme: ThemeName, accent: Accent) {
  Object.assign(colors, BASES[theme] ?? BASES.dark);
  colors.accent = ACCENTS[accent] ?? ACCENTS.blue;
  colors.accentDim = mixHex(colors.accent, colors.bg, 0.72);
  // Positive states (calories left, resume, completed sets, goal reached) follow the accent too.
  colors.success = colors.accent;
}

/** Colors for settings-row icon tiles. */
export const TILE = {
  green: '#30C25B', red: '#FF453A', pink: '#FF375F', orange: '#FF9F0A', cyan: '#32ADE6',
  indigo: '#5E5CE6', purple: '#BF5AF2', blue: '#0A84FF', gray: '#8E8E93', teal: '#30B0C7',
};

export const spacing = (n: number) => n * 4;
