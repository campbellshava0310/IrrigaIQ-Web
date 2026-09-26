import { describe, expect, it } from 'vitest';

import { decisionHeadline, wantsWater } from './presentation';
import type { Recommendation } from './types';

const recommendation = (overrides: Partial<Recommendation>): Recommendation => ({
  decision: 'ON_TRACK',
  status: 'ADEQUATE',
  irrigateOn: null,
  daysUntilStress: null,
  netDepthMm: 0,
  grossDepthMm: 0,
  volumeM3: 0,
  durationMinutes: 0,
  schedule: {
    startTime: '06:00:00',
    sessions: 1,
    sessionMinutes: 0,
    windowLabel: 'Morning start',
    note: null,
  },
  energyKwh: null,
  energyCost: null,
  currency: 'USD',
  expectedRainMm: 0,
  reasons: [],
  confidence: 'MEDIUM',
  confidenceNote: '',
  source: 'FAO56_WATER_BALANCE',
  modelVersion: 'fao56-1',
  ...overrides,
});

describe('decisionHeadline', () => {
  it('says what to do and when', () => {
    expect(decisionHeadline(recommendation({ decision: 'IRRIGATE_NOW' }))).toBe('Irrigate today');
    expect(
      decisionHeadline(recommendation({ decision: 'IRRIGATE_SOON', irrigateOn: '2026-09-27' })),
    ).toMatch(/^Irrigate by /);
    expect(decisionHeadline(recommendation({ decision: 'HOLD_FOR_RAIN' }))).toMatch(/rain/);
  });

  it('only asks for water when the soil is heading below the refill point', () => {
    expect(wantsWater('IRRIGATE_NOW')).toBe(true);
    expect(wantsWater('IRRIGATE_SOON')).toBe(true);
    expect(wantsWater('HOLD_FOR_RAIN')).toBe(false);
    expect(wantsWater('SCHEDULED')).toBe(false);
  });
});
