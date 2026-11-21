// Shared parts of the metadata audit (check-metadata.ts): findings, URL helpers and the hreflang code check.
import { DEPRECATED, LANGUAGES, REGIONS, SCRIPTS } from './language-codes.ts';

export type Level = 'error' | 'warn' | 'info' | 'ok';
// error: breaks a standard or a documented platform rule. warn: worth a look. info: a fact worth knowing. ok: passes.
export interface Finding { level: Level; subject: string; text: string }
export type Report = (level: Level, subject: string, text: string) => void;
export function collector() {
  const findings: Finding[] = [];
  const add: Report = (level, subject, text) => { findings.push({ level, subject, text }); };
  return { findings, add };
}

export const absolute = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
export function resolve(value: string, base: string): URL | null {
  try { return new URL(value, base); } catch { return null; }
}
export const bytes = (text: string) => Buffer.byteLength(text, 'utf8');
export const chars = (text: string) => [...text].length;
export const kib = (n: number) => `${Math.round(n / 1024)} KiB`;
export function parseJson(text: string): { value?: any; error?: string } {
  try { return { value: JSON.parse(text.replace(/^﻿/, '')) }; } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
}

// The pixel sizes an image file holds, as "WxH" strings: every entry of an ICO file, else the one size.
export const imageSizes = (info: { width: number | null; height: number | null; sizes?: string[] }) =>
  info.sizes ?? (info.width && info.height ? [`${info.width}x${info.height}`] : []);

// RFC 3339 / ISO 8601 date-times and W3C dates (YYYY, YYYY-MM, YYYY-MM-DD, or a date-time with a zone).
export const W3C_DATE = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;
export const RFC3339 = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}([Tt ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?([Zz]|[+-]\d{2}:?\d{2})?)?$/;

// An hreflang value as Google reads it: x-default, or an ISO 639-1 language with an optional ISO 15924 script and an
// optional ISO 3166-1 alpha-2 region. Returns the problem, or null when the code is valid.
export function hreflangProblem(code: string): { level: Level; text: string } | null {
  if (code.toLowerCase() === 'x-default') return null;
  const parts = code.split(/[-_]/);
  if (code.includes('_')) return { level: 'error', text: `\`${code}\` uses an underscore; hreflang codes use a hyphen, such as \`en-GB\`.` };
  const [language, ...rest] = parts;
  const lower = language.toLowerCase();
  if (DEPRECATED[lower] !== undefined) return { level: 'error', text: `\`${language}\` is a deprecated language code${DEPRECATED[lower] ? `; use \`${DEPRECATED[lower]}\`` : ''}.` };
  if (!LANGUAGES.has(lower)) return { level: 'error', text: `\`${language}\` is not an ISO 639-1 language code; Google reads only two-letter language codes here.` };
  let script: string | undefined;
  let region: string | undefined;
  for (const part of rest) {
    if (/^[a-z]{4}$/i.test(part) && !script && !region) script = part;
    else if (!region) region = part;
    else return { level: 'error', text: `\`${code}\` has more parts than language, script and region.` };
  }
  if (script && !SCRIPTS.has(script[0].toUpperCase() + script.slice(1).toLowerCase())) return { level: 'error', text: `\`${script}\` in \`${code}\` is not an ISO 15924 script code.` };
  if (region) {
    const upper = region.toUpperCase();
    if (upper === 'UK') return { level: 'error', text: `\`${code}\`: the region code for the United Kingdom is \`GB\`.` };
    if (/^\d{3}$/.test(region)) return { level: 'warn', text: `\`${code}\` uses a UN M.49 region; Google reads only ISO 3166-1 alpha-2 regions, such as \`es-MX\`.` };
    if (DEPRECATED[upper] !== undefined) return { level: 'error', text: `\`${region}\` is a deprecated region code${DEPRECATED[upper] ? `; use \`${DEPRECATED[upper]}\`` : ''}.` };
    if (!REGIONS.has(upper)) return { level: 'error', text: `\`${region}\` in \`${code}\` is not an ISO 3166-1 alpha-2 region code.` };
  }
  return null;
}
