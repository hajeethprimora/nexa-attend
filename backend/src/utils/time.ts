// Timezone-aware date helpers built on Intl (no external dependency).
// The server usually runs in UTC; the company works in config.timeZone.

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

export const isValidMonth = (month: string): boolean => MONTH_RE.test(month);
export const isValidDate = (date: string): boolean => DATE_RE.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
export const isValidTime = (time: string): boolean => TIME_RE.test(time);

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
};

export const getZonedParts = (date: Date, timeZone: string): ZonedParts => {
  const parts: Record<string, number> = {};
  for (const p of getFormatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second
  };
};

const pad = (n: number) => n.toString().padStart(2, '0');

/** YYYY-MM-DD of the given instant in the given zone. */
export const dateInZone = (date: Date | string, timeZone: string): string => {
  const p = getZonedParts(typeof date === 'string' ? new Date(date) : date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

/** HH:mm of the given instant in the given zone. */
export const timeInZone = (date: Date | string, timeZone: string): string => {
  const p = getZonedParts(typeof date === 'string' ? new Date(date) : date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
};

export const todayInZone = (timeZone: string): string => dateInZone(new Date(), timeZone);
export const currentMonthInZone = (timeZone: string): string => todayInZone(timeZone).slice(0, 7);

/** Offset (ms) of the zone from UTC at a given instant. */
const zoneOffsetMs = (instantMs: number, timeZone: string): number => {
  const p = getZonedParts(new Date(instantMs), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
};

/** Converts a wall-clock date + time in `timeZone` to a UTC Date. */
export const zonedToUtc = (date: string, time: string, timeZone: string): Date => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss || 0);
  let result = wallAsUtc - zoneOffsetMs(wallAsUtc, timeZone);
  // Second pass handles DST transitions
  result = wallAsUtc - zoneOffsetMs(result, timeZone);
  return new Date(result);
};

export const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const monthRange = (month: string): { start: string; end: string } => {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${pad(lastDay)}` };
};

const weekdayOf = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Number of non-weekend days in [start, end] (inclusive). */
export const countWorkingDays = (start: string, end: string, weekendDays: number[]): number => {
  if (start > end) return 0;
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!weekendDays.includes(weekdayOf(d))) count++;
  }
  return count;
};

export const maxDate = (a: string, b: string) => (a > b ? a : b);
export const minDate = (a: string, b: string) => (a < b ? a : b);

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
