interface TrendLineProps {
  values: number[];
  /** A chart token, e.g. var(--viz-water). */
  color: string;
  /** Daily pulses (irrigation volumes) read better as bars; continuous measures as a line. */
  variant?: 'line' | 'bars';
  height?: number;
  /** Spoken summary; the numbers themselves are in the metric and on the full chart. */
  label: string;
}

/** A trend at a glance inside a metric: no axes, scaled to its own range, zero at the bottom. */
export function TrendLine({ values, color, variant = 'line', height = 32, label }: TrendLineProps) {
  if (values.length < 2) {
    return null;
  }
  const max = Math.max(...values, 0);
  const pad = 2;
  const y = (value: number) => height - pad - (max > 0 ? (value / max) * (height - pad * 2) : 0);
  const step = 100 / values.length;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {variant === 'bars' ? (
        values.map((value, index) => (
          <rect
            key={index}
            x={index * step + step * 0.2}
            width={step * 0.6}
            y={y(value)}
            height={Math.max(value > 0 ? 1.5 : 0.75, height - pad - y(value))}
            style={{ fill: color, opacity: value > 0 ? 1 : 0.25 }}
          />
        ))
      ) : (
        <>
          <path
            d={`${linePath(values, y)} L100,${height} L0,${height} Z`}
            style={{ fill: color, opacity: 0.1 }}
          />
          <path
            d={linePath(values, y)}
            style={{ fill: 'none', stroke: color, strokeWidth: 1.5 }}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function linePath(values: number[], y: (value: number) => number): string {
  return values
    .map(
      (value, index) =>
        `${index === 0 ? 'M' : 'L'}${((index / (values.length - 1)) * 100).toFixed(2)},${y(value).toFixed(2)}`,
    )
    .join(' ');
}
