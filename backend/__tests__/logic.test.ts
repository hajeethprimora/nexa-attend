import { zonedToUtc, dateInZone, countWorkingDays, monthRange, isValidMonth, addDays } from '../src/utils/time';
import { computeDay, computeLateMinutes, autoCloseTime, sessionNetHours } from '../src/services/attendanceCalc';
import { csvCell, toCsv } from '../src/utils/csv';
import { resolveTimes } from '../src/services/adminAttendanceService';
import { calculateDays, daysByYear } from '../src/services/leaveService';
import { escapeHtml } from '../src/utils/emailService';

const IST = 'Asia/Kolkata';

describe('time utils', () => {
  it('converts wall-clock time in a zone to UTC', () => {
    expect(zonedToUtc('2026-10-01', '09:00', IST).toISOString()).toBe('2026-10-01T03:30:00.000Z');
    expect(zonedToUtc('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedToUtc('2026-01-15', '09:00', 'America/New_York').toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  it('computes the local date, not the UTC date', () => {
    // 20:00 UTC on Sep 30 is already Oct 1 in India
    expect(dateInZone('2026-09-30T20:00:00Z', IST)).toBe('2026-10-01');
  });

  it('counts working days excluding weekends', () => {
    expect(countWorkingDays('2026-10-01', '2026-10-31', [0, 6])).toBe(22);
    expect(countWorkingDays('2026-10-03', '2026-10-04', [0, 6])).toBe(0);
  });

  it('handles month ranges and validation', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('attendance calculations', () => {
  it('measures late minutes against the shift start in the company zone', () => {
    expect(computeLateMinutes('2026-10-01T03:45:00Z', '2026-10-01', '09:00:00', IST)).toBe(15);
    expect(computeLateMinutes('2026-10-01T03:25:00Z', '2026-10-01', '09:00:00', IST)).toBe(0);
    expect(computeLateMinutes('2026-10-01T03:40:00Z', '2026-10-01', '09:00:00', IST, 10)).toBe(0);
  });

  it('subtracts breaks from worked hours', () => {
    const hours = sessionNetHours({
      clock_in: '2026-10-01T03:30:00Z',
      clock_out: '2026-10-01T12:30:00Z',
      breaks: [{ start: '2026-10-01T07:30:00Z', end: '2026-10-01T08:30:00Z' }]
    });
    expect(hours).toBe(8);
  });

  it('applies late only to the first session and overtime across the whole day', () => {
    const results = computeDay(
      [
        { id: 'b', clock_in: '2026-10-01T09:00:00Z', clock_out: '2026-10-01T14:00:00Z', breaks: [] },
        { id: 'a', clock_in: '2026-10-01T03:45:00Z', clock_out: '2026-10-01T08:45:00Z', breaks: [] }
      ],
      { workDate: '2026-10-01', shiftStart: '09:00:00', timeZone: IST, standardHours: 8 }
    );
    const a = results.find(r => r.id === 'a')!;
    const b = results.find(r => r.id === 'b')!;
    expect(a).toMatchObject({ total_hours: 5, overtime_hours: 0, late_minutes: 15 });
    expect(b).toMatchObject({ total_hours: 5, overtime_hours: 2, late_minutes: 0 });
  });

  it('auto-closes a forgotten session at shift end but never before clock-in', () => {
    const now = '2026-10-02T12:00:00Z';
    expect(autoCloseTime('2026-10-01T03:30:00Z', '2026-10-01', '17:00:00', IST, now)).toBe('2026-10-01T11:30:00.000Z');
    expect(autoCloseTime('2026-10-01T13:00:00Z', '2026-10-01', '17:00:00', IST, now)).toBe('2026-10-01T13:00:00.000Z');
  });
});

describe('admin time entry', () => {
  it('rolls clock-out past midnight to the next day', () => {
    const t = resolveTimes({ date: '2026-10-01', clock_in: '20:00', clock_out: '02:00', breaks: [] }, IST);
    expect(t.clock_in).toBe('2026-10-01T14:30:00.000Z');
    expect(t.clock_out).toBe('2026-10-01T20:30:00.000Z');
  });

  it('rejects breaks outside the session', () => {
    expect(() => resolveTimes({ date: '2026-10-01', clock_in: '09:00', clock_out: '12:00', breaks: [{ start: '11:30', end: '13:00' }] }, IST))
      .toThrow(/between clock-in and clock-out/);
  });
});

describe('leave day counting', () => {
  it('counts working days only and splits across years', () => {
    expect(calculateDays('2026-10-02', '2026-10-05')).toBe(2); // Fri + Mon
    expect(calculateDays('2026-09-28', '2026-10-09', '2026-10-01', '2026-10-31')).toBe(7);
    const split = daysByYear('2026-12-30', '2027-01-04');
    expect(split.get(2026)).toBe(2);
    expect(split.get(2027)).toBe(2);
  });
});

describe('output escaping', () => {
  it('neutralises spreadsheet formulas and quotes cells', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('Doe, Jane')).toBe('"Doe, Jane"');
    expect(csvCell(-5)).toBe('-5');
    expect(toCsv(['a'], [['b']])).toBe('﻿a\r\nb\r\n');
  });

  it('escapes HTML in emails', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  });
});
