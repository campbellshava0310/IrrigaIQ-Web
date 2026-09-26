import { describe, expect, it } from 'vitest';

import { NAVIGATION, isActive } from './navigation';

const item = (label: string) => {
  const found = NAVIGATION.flatMap((section) => section.items).find(
    (candidate) => candidate.label === label,
  );
  if (!found) throw new Error(`No nav item ${label}`);
  return found;
};

describe('isActive', () => {
  it('highlights the owning section on farm-scoped detail pages', () => {
    const fieldPage = '/farms/f1/fields/x1';
    const assetPage = '/farms/f1/assets/a1';
    expect(isActive(item('Irrigation'), fieldPage)).toBe(true);
    expect(isActive(item('Infrastructure'), assetPage)).toBe(true);
    expect(isActive(item('Farms & fields'), fieldPage)).toBe(false);
    expect(isActive(item('Farms & fields'), '/farms/f1')).toBe(true);
  });

  it('matches the overview only exactly', () => {
    expect(isActive(item('Overview'), '/')).toBe(true);
    expect(isActive(item('Overview'), '/water')).toBe(false);
  });
});
