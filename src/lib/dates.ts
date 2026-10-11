// Date helpers built on ISO strings ("YYYY-MM-DD", Gregorian).
// RULE: the ISO Gregorian string is the single source of truth for every stored date.
// The Ethiopian date is only ever computed for display and for the date picker.

import {
  ETH_MONTHS_AM,
  ETH_MONTHS_EN,
  WEEKDAYS_AM,
  WEEKDAYS_AM_SHORT,
  WEEKDAYS_EN,
  WEEKDAYS_EN_SHORT,
  daysInEthMonth,
  ethToJdn,
  jdnToEth,
  gregorianToJdn,
  jdnToGregorian,
  weekdayOfJdn,
} from './ethiopian.ts';
import type { EthDate } from './ethiopian.ts';

export type ISODate = string;
export type Lang = 'en' | 'am';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const GREG_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && ISO_RE.test(value);
}

export function isoToJdn(iso: ISODate): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  return gregorianToJdn({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) });
}

export function jdnToISO(jdn: number): ISODate {
  const g = jdnToGregorian(jdn);
  return `${pad(g.year, 4)}-${pad(g.month, 2)}-${pad(g.day, 2)}`;
}

/** Today in the device's local time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

export function addDays(iso: ISODate, n: number): ISODate {
  return jdnToISO(isoToJdn(iso) + n);
}

/** Whole days from b to a (a - b). */
export function diffDays(a: ISODate, b: ISODate): number {
  return isoToJdn(a) - isoToJdn(b);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(iso: ISODate): number {
  return weekdayOfJdn(isoToJdn(iso));
}

export function isoToEth(iso: ISODate): EthDate {
  return jdnToEth(isoToJdn(iso));
}

export function ethToISO(e: EthDate): ISODate {
  return jdnToISO(ethToJdn(e));
}

/** The last n days ending on `end`, oldest first. */
export function lastNDays(end: ISODate, n: number): ISODate[] {
  const out: ISODate[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

export function monthName(month: number, lang: Lang): string {
  return (lang === 'am' ? ETH_MONTHS_AM : ETH_MONTHS_EN)[month - 1] ?? '';
}

export function weekdayName(weekday: number, lang: Lang, short = false): string {
  if (lang === 'am') return (short ? WEEKDAYS_AM_SHORT : WEEKDAYS_AM)[weekday] ?? '';
  return (short ? WEEKDAYS_EN_SHORT : WEEKDAYS_EN)[weekday] ?? '';
}

interface FormatOptions {
  weekday?: boolean;
  year?: boolean;
}

/** Ethiopian display format, e.g. "Meskerem 29, 2019" or "Fri, Meskerem 29". */
export function formatEth(iso: ISODate, lang: Lang, opts: FormatOptions = {}): string {
  const { weekday = false, year = true } = opts;
  const e = isoToEth(iso);
  const core = `${monthName(e.month, lang)} ${e.day}${year ? `, ${e.year}` : ''}`;
  return weekday ? `${weekdayName(weekdayOf(iso), lang, true)}, ${core}` : core;
}

export function formatGregorian(iso: ISODate): string {
  const m = ISO_RE.exec(iso);
  if (!m) return iso;
  return `${GREG_MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

const REL_EN = { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday' };
const REL_AM = { today: 'ዛሬ', tomorrow: 'ነገ', yesterday: 'ትናንት' };

/** "Today" / "Tomorrow" / "Yesterday", otherwise the Ethiopian date (year only if it differs). */
export function relativeLabel(iso: ISODate, today: ISODate, lang: Lang): string {
  const diff = diffDays(iso, today);
  const rel = lang === 'am' ? REL_AM : REL_EN;
  if (diff === 0) return rel.today;
  if (diff === 1) return rel.tomorrow;
  if (diff === -1) return rel.yesterday;
  const sameYear = isoToEth(iso).year === isoToEth(today).year;
  return formatEth(iso, lang, { year: !sameYear });
}

/** Weekday indexes in display order, e.g. weekStart 1 -> [1,2,3,4,5,6,0]. */
export function weekdayOrder(weekStart: 0 | 1): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7);
}

/** Cells for a month grid: leading nulls for alignment, then every day of the month as ISO. */
export function monthGrid(year: number, month: number, weekStart: 0 | 1): (ISODate | null)[] {
  const firstISO = ethToISO({ year, month, day: 1 });
  const lead = (weekdayOf(firstISO) - weekStart + 7) % 7;
  const cells: (ISODate | null)[] = Array.from({ length: lead }, () => null);
  const count = daysInEthMonth(year, month);
  for (let day = 1; day <= count; day++) cells.push(ethToISO({ year, month, day }));
  return cells;
}

/** Move by whole Ethiopian months (a year has 13). */
export function shiftEthMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 13 + (month - 1) + delta;
  return { year: Math.floor(index / 13), month: (((index % 13) + 13) % 13) + 1 };
}
