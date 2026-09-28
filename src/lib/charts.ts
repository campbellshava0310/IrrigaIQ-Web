// The one entry point for chart components. Importing the chart styles here (not in main.tsx) keeps
// Recharts and its CSS out of the first load: only the code-split chart pages pull this in.
import '@mantine/charts/styles.css';

export { AreaChart, CompositeChart, LineChart } from '@mantine/charts';
export { ReferenceDot } from 'recharts';
