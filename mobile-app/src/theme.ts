/**
 * Design tokens taken from designs/AgroThulir-Farmer (THEME in design.js and
 * the matching preview.css custom properties). Farmer-first palette: forest
 * green, fresh lime, pale sage, warm white.
 */
export const colors = {
  forest: '#133C2C',
  green: '#236244',
  lime: '#D5ED9C',
  sage: '#EDF3E4',
  paper: '#F8F9F3',
  white: '#FFFFFF',
  ink: '#17372A',
  muted: '#5E7065',
  line: '#DCE5D7',
  amber: '#885100',
  amberBg: '#FFF0CF',
  red: '#AD3430',
  redBg: '#FCE8E3',
  blue: '#2C648A',
  blueBg: '#E8F2F8',
  stepLine: '#EEF2E9',
  heroCopy: '#F0F5E7',
} as const;

export type Tone = 'green' | 'amber' | 'red' | 'blue';

/** Foreground / background pair for each state tone. Words always accompany colour. */
export const tones: Record<Tone, { fg: string; bg: string }> = {
  green: { fg: colors.green, bg: colors.sage },
  amber: { fg: colors.amber, bg: colors.amberBg },
  red: { fg: colors.red, bg: colors.redBg },
  blue: { fg: colors.blue, bg: colors.blueBg },
};

export const radius = {
  card: 20,
  hero: 24,
  action: 18,
  pill: 999,
} as const;

export const spacing = {
  gutter: 22,
  gap: 14,
  inner: 16,
} as const;

/** 56 px actions and 48 px touch targets, per the farmer-first direction. */
export const sizes = {
  action: 56,
  touch: 48,
  row: 90,
  tabBar: 82,
} as const;

export const type = {
  title: { fontSize: 27, lineHeight: 31, letterSpacing: -0.8, fontWeight: '700' as const },
  heroValue: { fontSize: 36, lineHeight: 43, letterSpacing: -1.2, fontWeight: '700' as const },
  metric: { fontSize: 28, lineHeight: 36, letterSpacing: -0.7, fontWeight: '700' as const },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.7, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  action: { fontSize: 16, lineHeight: 21, fontWeight: '600' as const },
} as const;
