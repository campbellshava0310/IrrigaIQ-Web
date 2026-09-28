import {
  ChartTooltipCard,
  type ChartTooltipOptions,
  type TooltipContent,
} from './ChartTooltipCard';

/**
 * Tooltip props for Mantine charts: a card with the day, each series with its swatch and value,
 * and optional lines that say what the numbers mean, plus a crosshair or column band.
 */
export function chartTooltip(options: ChartTooltipOptions) {
  return {
    cursor:
      options.cursor === 'band'
        ? { fill: 'var(--app-hover-strong)' }
        : { stroke: 'var(--viz-reference)', strokeWidth: 1 },
    content: (props: TooltipContent) => <ChartTooltipCard {...props} {...options} />,
  };
}
