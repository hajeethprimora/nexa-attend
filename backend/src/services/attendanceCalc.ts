// Pure attendance math, kept free of I/O so it can be unit tested.
import { BreakEntry } from '../types';
import { round2, zonedToUtc } from '../utils/time';

const HOUR_MS = 1000 * 60 * 60;

export const calculateBreakHours = (
  breaks: BreakEntry[],
  legacyStart?: string | null,
  legacyEnd?: string | null,
  currentTimeISO: string | null = null
): number => {
  const nowMs = currentTimeISO ? new Date(currentTimeISO).getTime() : Date.now();
  let totalBreakMs = 0;

  if (Array.isArray(breaks) && breaks.length > 0) {
    breaks.forEach(b => {
      if (!b.start) return;
      const startMs = new Date(b.start).getTime();
      const endMs = b.end ? new Date(b.end).getTime() : nowMs;
      if (endMs > startMs) totalBreakMs += endMs - startMs;
    });
  } else if (legacyStart) {
    const startMs = new Date(legacyStart).getTime();
    const endMs = legacyEnd ? new Date(legacyEnd).getTime() : nowMs;
    if (endMs > startMs) totalBreakMs += endMs - startMs;
  }

  return totalBreakMs / HOUR_MS;
};

interface SessionLike {
  clock_in: string;
  clock_out: string | null;
  breaks?: BreakEntry[] | null;
  break_start?: string | null;
  break_end?: string | null;
}

/** Net worked hours of a session (open sessions are measured up to `nowISO`). */
export const sessionNetHours = (session: SessionLike, nowISO: string = new Date().toISOString()): number => {
  const endISO = session.clock_out || nowISO;
  const grossHours = (new Date(endISO).getTime() - new Date(session.clock_in).getTime()) / HOUR_MS;
  const breakHours = calculateBreakHours(session.breaks || [], session.break_start, session.break_end, endISO);
  return round2(Math.max(0, grossHours - breakHours));
};

/** Minutes after (shift start + grace) that the clock-in happened, in the company zone. */
export const computeLateMinutes = (
  clockInISO: string,
  workDate: string,
  shiftStart: string | null | undefined,
  timeZone: string,
  graceMinutes = 0
): number => {
  if (!shiftStart) return 0;
  const expected = zonedToUtc(workDate, shiftStart.slice(0, 5), timeZone).getTime();
  const diffMinutes = Math.floor((new Date(clockInISO).getTime() - expected) / 60000);
  return diffMinutes > graceMinutes ? diffMinutes : 0;
};

export interface DaySessionInput extends SessionLike {
  id: string;
}

export interface DaySessionResult {
  id: string;
  total_hours: number;
  overtime_hours: number;
  late_minutes: number;
}

/**
 * Recomputes hours / overtime / late for all CLOSED sessions of one user on one day.
 * - Late minutes apply only to the first session of the day.
 * - Overtime is the hours beyond the standard workday, attributed to the
 *   sessions (in chronological order) that pushed the day over the limit.
 */
export const computeDay = (
  sessions: DaySessionInput[],
  opts: { workDate: string; shiftStart?: string | null; timeZone: string; standardHours: number; graceMinutes?: number }
): DaySessionResult[] => {
  const sorted = [...sessions].sort((a, b) => a.clock_in.localeCompare(b.clock_in));
  let accumulated = 0;

  return sorted.map((s, index) => {
    const hours = s.clock_out ? sessionNetHours(s) : 0;
    const overtimeBefore = Math.max(0, accumulated - opts.standardHours);
    accumulated += hours;
    const overtimeAfter = Math.max(0, accumulated - opts.standardHours);

    return {
      id: s.id,
      total_hours: hours,
      overtime_hours: round2(overtimeAfter - overtimeBefore),
      late_minutes: index === 0
        ? computeLateMinutes(s.clock_in, opts.workDate, opts.shiftStart, opts.timeZone, opts.graceMinutes)
        : 0
    };
  });
};

/**
 * Where to close a session the employee forgot to clock out of:
 * their scheduled shift end on that work day, but never before clock-in and never in the future.
 */
export const autoCloseTime = (
  clockInISO: string,
  workDate: string,
  shiftEnd: string | null | undefined,
  timeZone: string,
  nowISO: string = new Date().toISOString()
): string => {
  const clockInMs = new Date(clockInISO).getTime();
  const shiftEndMs = zonedToUtc(workDate, (shiftEnd || '17:00').slice(0, 5), timeZone).getTime();
  const closeMs = Math.min(Math.max(shiftEndMs, clockInMs), new Date(nowISO).getTime());
  return new Date(closeMs).toISOString();
};
