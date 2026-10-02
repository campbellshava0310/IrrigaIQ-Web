import { describe, expect, it } from 'vitest';

import {
  daysFromToday,
  formatDepth,
  formatDueIn,
  formatDuration,
  formatVolume,
  toIsoDate,
} from './format';

const NOW = new Date(2026, 8, 25, 10, 30); // 25 Sep 2026, local time

describe('formatDuration', () => {
  it('reads as hours and minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(845)).toBe('14 h 5 min');
    expect(formatDuration(null)).toBe('—');
  });
});

describe('water quantities', () => {
  it('keeps a decimal for small volumes so short drip runs do not read as zero', () => {
    expect(formatVolume(0.4)).toBe('0.4 m³');
    expect(formatVolume(844.04)).toBe('844 m³');
    expect(formatDepth(42.19)).toBe('42.2 mm');
  });
});

describe('calendar dates', () => {
  it('counts days from today without time-zone drift', () => {
    expect(daysFromToday('2026-09-25', NOW)).toBe(0);
    expect(daysFromToday('2026-09-27', NOW)).toBe(2);
    expect(daysFromToday('2026-08-31', NOW)).toBe(-25);
  });

  it('describes due dates in words', () => {
    expect(formatDueIn('2026-09-25', NOW)).toBe('today');
    expect(formatDueIn('2026-09-26', NOW)).toBe('tomorrow');
    expect(formatDueIn('2026-09-30', NOW)).toBe('in 5 days');
    expect(formatDueIn('2026-09-15', NOW)).toBe('10 days ago');
  });

  it('formats API dates in local time', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
