import { describe, expect, it } from 'vitest';

import { changePct } from './change';

describe('changePct', () => {
  it('measures the change against the earlier value', () => {
    expect(changePct(120, 100)).toBeCloseTo(20);
    expect(changePct(75, 100)).toBeCloseTo(-25);
  });

  it('uses the size of a negative baseline, so recovering from a deficit reads as up', () => {
    expect(changePct(50, -100)).toBeCloseTo(150);
  });

  it('has nothing to compare with when the earlier value is missing or zero', () => {
    expect(changePct(10, null)).toBeNull();
    expect(changePct(10, undefined)).toBeNull();
    expect(changePct(10, 0)).toBeNull();
    expect(changePct(0, 0)).toBe(0);
  });
});
