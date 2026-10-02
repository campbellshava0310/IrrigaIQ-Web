import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';

/**
 * Eases a number from its previous value to the new one (from 0 on first render), so headline
 * figures settle into place instead of popping. Returns the target as-is when the user prefers
 * reduced motion.
 */
export function useCountUp(target: number, duration = 600): number {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && Number.isFinite(target);
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!animate) {
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      // Remember where we are, so a new target mid-animation continues from the shown value.
      from.current = origin + (target - origin) * eased;
      setValue(from.current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [animate, target, duration]);

  return animate ? value : target;
}
