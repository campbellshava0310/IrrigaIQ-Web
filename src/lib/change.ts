/** Percentage change from `previous` to `current`; null when there is nothing to compare with. */
export function changePct(current: number, previous: number | null | undefined): number | null {
  if (previous == null || !Number.isFinite(previous)) {
    return null;
  }
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}
