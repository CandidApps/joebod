import { readJson, writeJson } from '@/lib/storage';

const PRIMARY_KEY = 'eclipse-primary-color-v1';
const ACCENT_KEY = 'eclipse-accent-color-v1';

export const PRIMARY_PRESETS = [
  '#5A82E0',
  '#F2785A',
  '#E0322D',
  '#50E096',
  '#B85A93',
  '#935AE0',
] as const;

export const ACCENT_PRESETS = [
  '#8FC0F2',
  '#F2C879',
  '#7FD4D4',
  '#B7A8F5',
  '#E0806A',
  '#7DE8B0',
] as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  const r = m(A.r, B.r);
  const g = m(A.g, B.g);
  const bl = m(A.b, B.b);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function readableInk(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#171614' : '#F5F1EC';
}

function deriveCornersFromPrimary(primary: string, accent: string) {
  return {
    tl: primary,
    tr: mixHex(primary, accent, 0.35),
    br: mixHex(primary, '#171614', 0.45),
    bl: mixHex(accent, '#171614', 0.55),
  };
}

export function getPrimaryColor(): string {
  return readJson(PRIMARY_KEY, PRIMARY_PRESETS[0]);
}

export function getAccentColor(): string {
  return readJson(ACCENT_KEY, ACCENT_PRESETS[0]);
}

export function applyPrimaryColor(hex: string, accent = getAccentColor()): void {
  if (typeof document === 'undefined') return;
  const corners = deriveCornersFromPrimary(hex, accent);
  const r = document.documentElement.style;
  r.setProperty('--corner-tl', corners.tl);
  r.setProperty('--corner-tr', corners.tr);
  r.setProperty('--corner-br', corners.br);
  r.setProperty('--corner-bl', corners.bl);
  r.setProperty('--primary-user', hex);
}

export function applyAccentColor(hex: string): void {
  if (typeof document === 'undefined') return;
  const { r, g, b } = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty('--accent-user', hex);
  root.setProperty('--accent-user-ink', readableInk(hex));
  root.setProperty('--accent-user-glow', `rgba(${r},${g},${b},0.65)`);
  root.setProperty('--accent', hex);
  root.setProperty('--accent-ink', readableInk(hex));
  applyPrimaryColor(getPrimaryColor(), hex);
}

export function savePrimaryColor(hex: string): void {
  writeJson(PRIMARY_KEY, hex);
  applyPrimaryColor(hex);
}

export function saveAccentColor(hex: string): void {
  writeJson(ACCENT_KEY, hex);
  applyAccentColor(hex);
}

export function loadAppearanceColors(): void {
  applyAccentColor(getAccentColor());
  applyPrimaryColor(getPrimaryColor());
}
