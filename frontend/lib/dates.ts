// Date helpers that use the user's LOCAL calendar (toISOString() would use UTC
// and pick the wrong day/month around midnight).

const pad = (n: number) => n.toString().padStart(2, '0');

export const localDate = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localMonth = (d: Date = new Date()) => localDate(d).slice(0, 7);

/** HH:mm of an ISO instant, optionally in a specific IANA zone (company timezone). */
export const formatTime = (iso?: string | null, timeZone?: string) => {
  if (!iso) return '--:--';
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

/** 24h HH:mm suitable for <input type="time"> in the given zone. */
export const timeInputValue = (iso?: string | null, timeZone?: string) => {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(new Date(iso));
  const h = parts.find(p => p.type === 'hour')?.value || '00';
  const m = parts.find(p => p.type === 'minute')?.value || '00';
  return `${h}:${m}`;
};

export const formatDateLabel = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Hours worked in an open session so far (for the live counter). */
export const liveHours = (clockIn: string, breaks: { start: string; end: string | null }[] = [], now = Date.now()) => {
  const gross = now - new Date(clockIn).getTime();
  const breakMs = breaks.reduce((sum, b) => {
    const s = new Date(b.start).getTime();
    const e = b.end ? new Date(b.end).getTime() : now;
    return sum + Math.max(0, e - s);
  }, 0);
  return Math.max(0, (gross - breakMs) / 3600000);
};

export const DEPARTMENTS = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'HR', label: 'HR & Operations' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Management', label: 'Management' }
];
