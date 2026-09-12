import React, {useMemo} from 'react';
import {SvgXml} from 'react-native-svg';
import {colors} from './theme';

/**
 * Outlined equipment and status icons copied verbatim from the design source
 * (ICONS in designs/AgroThulir-Farmer/design.js) so the app and the prototype
 * draw the same motor, valve, pipe, tank and water shapes.
 */
export const ICON_PATHS = {
  leaf: '<path d="M20 3C9 3 3 8 4 15c1 7 11 6 13-1 1-4 1-7 3-11Z"/><path d="M3 22c3-7 7-11 12-14"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  motor: '<path d="M2 10h3m14 2h3M6 7h11a2 2 0 0 1 2 2v8H6V7ZM9 4h5v3M5 20h15M8 17v3m9-3v3M9 10v4m3-4v4m3-4v4"/>',
  valve: '<path d="M2 9h3l7 4-7 4H2V9Zm20 0h-3l-7 4 7 4h3V9ZM12 4v9M8 4h8"/><circle cx="12" cy="4" r="1"/>',
  tank: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 13c4 3 12 3 16 0"/>',
  sensor: '<path d="M12 10v12M7 22h10M6 4a8 8 0 0 0 0 12M18 4a8 8 0 0 1 0 12M9 7a4 4 0 0 0 0 6M15 7a4 4 0 0 1 0 6"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4M19 9h4m-4 6h4"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  flow: '<rect x="2" y="2" width="7" height="7" rx="2"/><rect x="15" y="15" width="7" height="7" rx="2"/><path d="M9 5h6a4 4 0 0 1 4 4v6M5 9v10h10m1-7 3 3 3-3"/>',
  calendar: '<rect x="3" y="5" width="18" height="17" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 5 3 3 5-5"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/>',
  drop: '<path d="M12 2s8 8 8 13a8 8 0 0 1-16 0c0-5 8-13 8-13ZM8 15c0 3 2 4 4 4"/>',
  power: '<path d="M12 2v10M6 5a9 9 0 1 0 12 0"/>',
  play: '<path d="m7 3 14 9-14 9V3Z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  check: '<path d="m4 12 5 5L21 5"/>',
  plus: '<path d="M12 3v18M3 12h18"/>',
  back: '<path d="m15 4-8 8 8 8"/>',
  next: '<path d="m9 4 8 8-8 8"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  arrow: '<path d="M2 12h20m-7-7 7 7-7 7"/>',
  shield: '<path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Z"/><path d="m7 12 3 3 6-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 5v7l4 3"/>',
  alert: '<path d="M12 2 1 21h22L12 2ZM12 9v5m0 3v1"/>',
  wifi: '<path d="M2 7a15 15 0 0 1 20 0M5 11a10 10 0 0 1 14 0m-10 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
  offline:
    '<path d="M2 2l20 20M2 7a15 15 0 0 1 4-2M9 3a15 15 0 0 1 13 4M5 11a10 10 0 0 1 5-3m-1 7a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
  qr: '<path d="M2 8V2h6m8 0h6v6M2 16v6h6m8 0h6v-6"/><rect x="6" y="6" width="4" height="4"/><rect x="14" y="6" width="4" height="4"/><path d="M6 14h4v4H6zM14 14h4v4h-4"/>',
  edit: '<path d="m16 3 5 5L9 20H4v-5L16 3ZM13 6l5 5"/>',
  trash: '<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  link: '<path d="m9 15 6-6M8 12 5 15a3 3 0 0 0 4 4l3-3m0-8 3-3a3 3 0 0 1 4 4l-3 3"/>',
  reorder: '<path d="M7 3v18m-3-3 3 3 3-3M17 21V3m-3 3 3-3 3 3"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  chart: '<path d="M3 3v18h19M7 16l4-7 4 3 6-8"/>',
  pause: '<path d="M6 3h4v18H6ZM14 3h4v18h-4Z"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2h0l1.5 3.2 3.5-.6.6 3.5L21 10l-1.4 2 1.4 2-3.4 1.9-.6 3.5-3.5-.6L12 22l-1.5-3.2-3.5.6-.6-3.5L3 14l1.4-2L3 10l3.4-1.9.6-3.5 3.5.6L12 2Z"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

type IconProps = {
  name: IconName;
  color?: string;
  size?: number;
  /** Outline weight; 1.8 matches the design source. */
  strokeWidth?: number;
};

export function Icon({name, color = colors.green, size = 28, strokeWidth = 1.8}: IconProps) {
  const xml = useMemo(
    () =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${
        ICON_PATHS[name] ?? ICON_PATHS.leaf
      }</svg>`,
    [name, color, size, strokeWidth],
  );
  return <SvgXml xml={xml} width={size} height={size} />;
}
