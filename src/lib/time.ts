// Clock-time helpers. Times are stored as "HH:MM" (24-hour, device local time).

export interface Clock {
  hour: number;
  minute: number;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTime(value: string): Clock | null {
  const m = TIME_RE.exec(value);
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

export function isTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

/** "15:30" -> "3:30 PM", "00:05" -> "12:05 AM". Returns the input unchanged if it is not a valid time. */
export function formatTime12(value: string): string {
  const t = parseTime(value);
  if (!t) return value;
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  return `${h12}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}`;
}

/** Local "HH:MM" of a Date. */
export function timeFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
