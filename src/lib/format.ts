const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
];

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : '—';
}

/** Formats a calendar date (YYYY-MM-DD) without shifting it through the local time zone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const [year, month, day] = value.split('-').map(Number);
  return date.format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

export function formatRelative(value: string | null | undefined, now: number = Date.now()): string {
  if (!value) {
    return 'never';
  }
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return '—';
}

export function formatHectares(value: number | null | undefined): string {
  return value == null ? '—' : `${decimal.format(value)} ha`;
}

/** SANDY_CLAY_LOAM -> "Sandy clay loam" */
export function humanize(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const text = value.toLowerCase().replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const numberFormats = new Map<number, Intl.NumberFormat>();

/** Locale number with a fixed maximum of fraction digits (formatters are cached). */
export function formatNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  let format = numberFormats.get(maximumFractionDigits);
  if (!format) {
    format = new Intl.NumberFormat(undefined, { maximumFractionDigits });
    numberFormats.set(maximumFractionDigits, format);
  }
  return format.format(value);
}

/** Water volume in m³; small volumes keep one decimal so a 0.4 m³ drip run doesn't read as 0. */
export function formatVolume(m3: number | null | undefined): string {
  if (m3 == null) {
    return '—';
  }
  return `${formatNumber(m3, Math.abs(m3) < 10 ? 1 : 0)} m³`;
}

export function formatDepth(mm: number | null | undefined): string {
  return mm == null ? '—' : `${formatNumber(mm, 1)} mm`;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  return value == null ? '—' : `${formatNumber(value, digits)}%`;
}

/** 135 -> "2 h 15 min" */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) {
    return '—';
  }
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatMoney(value: number | null | undefined, currency = 'USD'): string {
  if (value == null) {
    return '—';
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${formatNumber(value, 2)}`;
  }
}

/** "06:00:00" -> "06:00" */
export function formatClock(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '—';
}

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const weekdayDayMonth = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const shortTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

function calendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/** "2026-09-28" -> "Mon" */
export function formatWeekday(value: string): string {
  return weekday.format(calendarDate(value));
}

/** "2026-09-28" -> "28 Sep" */
export function formatDayMonth(value: string): string {
  return dayMonth.format(calendarDate(value));
}

/** "2026-09-28" -> "Mon, 28 Sep" */
export function formatDayLabel(value: string | null | undefined): string {
  return value ? weekdayDayMonth.format(calendarDate(value)) : '—';
}

/** Instant -> "Mon, 28 Sep · 22:00" in the viewer's time zone. */
export function formatWhen(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return `${weekdayDayMonth.format(date)} · ${shortTime.format(date)}`;
}

/** Whole days from today (local) to a calendar date; negative when in the past. */
export function daysFromToday(value: string, now: Date = new Date()): number {
  const target = calendarDate(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** "in 3 days" / "today" / "5 days ago" for a calendar date. */
export function formatDueIn(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) {
    return '—';
  }
  const days = daysFromToday(value, now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Local YYYY-MM-DD for a Date (for API date parameters). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
