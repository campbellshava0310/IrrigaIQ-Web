import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  createTheme,
  Menu,
  Modal,
  NavLink,
  Paper,
  Progress,
  SegmentedControl,
  Table,
  Tabs,
  ThemeIcon,
  Tooltip,
  type MantineColorsTuple,
} from '@mantine/core';

/** IrrigaIQ teal: shade 7 is the light-mode accent, shade 4 the dark-mode accent (same as the app). */
const brand: MantineColorsTuple = [
  '#E8F6F7',
  '#CFEBEE',
  '#A2D8DD',
  '#71C3CB',
  '#48B0BA',
  '#2E9FAB',
  '#168D99',
  '#0A7C86',
  '#08666F',
  '#064F57',
];

/** Success green, distinct from the brand teal so "healthy" never reads as "selected". */
const teal: MantineColorsTuple = [
  '#E7F7EF',
  '#CDEEDD',
  '#9CDDBB',
  '#67CB97',
  '#3DBB79',
  '#22B166',
  '#12A15A',
  '#12875A',
  '#0B6F49',
  '#055837',
];

/** Cool neutrals for text, borders and fills. */
const gray: MantineColorsTuple = [
  '#F7F8F9',
  '#F1F3F4',
  '#E7EAEC',
  '#DADEE1',
  '#C3C9CD',
  '#9AA2A9',
  '#6E767D',
  '#50585E',
  '#383E43',
  '#22272B',
];

/** Dark-mode surfaces: near-black canvas, lifted cards, soft borders. */
const dark: MantineColorsTuple = [
  '#E4E7EA',
  '#B8BFC5',
  '#8E979E',
  '#666F76',
  '#353B40',
  '#262B2F',
  '#1C2023',
  '#15181A',
  '#0F1113',
  '#0A0C0D',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 7, dark: 4 },
  colors: { brand, teal, gray, dark },
  white: '#FFFFFF',
  black: '#0B1215',
  fontFamily:
    '"Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSizes: { xs: '12px', sm: '13.5px', md: '15px', lg: '17px', xl: '20px' },
  lineHeights: { xs: '1.45', sm: '1.5', md: '1.55', lg: '1.5', xl: '1.4' },
  radius: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  defaultRadius: 'sm',
  spacing: { xs: '8px', sm: '12px', md: '16px', lg: '24px', xl: '32px' },
  shadows: {
    xs: '0 1px 2px rgba(16, 24, 40, 0.04)',
    sm: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.05)',
    md: '0 2px 4px -2px rgba(16, 24, 40, 0.05), 0 6px 16px -4px rgba(16, 24, 40, 0.08)',
    lg: '0 4px 8px -4px rgba(16, 24, 40, 0.06), 0 16px 32px -8px rgba(16, 24, 40, 0.12)',
    xl: '0 8px 16px -8px rgba(16, 24, 40, 0.08), 0 24px 48px -12px rgba(16, 24, 40, 0.18)',
  },
  headings: {
    fontWeight: '650',
    sizes: {
      h1: { fontSize: '28px', lineHeight: '1.2' },
      h2: { fontSize: '24px', lineHeight: '1.25' },
      h3: { fontSize: '20px', lineHeight: '1.3' },
      h4: { fontSize: '16px', lineHeight: '1.4' },
      h5: { fontSize: '14px', lineHeight: '1.4' },
    },
  },
  cursorType: 'pointer',
  focusRing: 'auto',
  components: {
    Card: Card.extend({
      defaultProps: { radius: 'md', padding: 'lg' },
      classNames: { root: 'app-surface' },
    }),
    Paper: Paper.extend({ defaultProps: { radius: 'md' }, classNames: { root: 'app-paper' } }),
    Button: Button.extend({ defaultProps: { radius: 'sm' }, classNames: { root: 'app-button' } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { radius: 'sm' } }),
    Badge: Badge.extend({
      defaultProps: { variant: 'light', radius: 'xl', tt: 'none', size: 'md' },
      classNames: { root: 'app-badge' },
    }),
    ThemeIcon: ThemeIcon.extend({ defaultProps: { variant: 'light', radius: 'sm' } }),
    Table: Table.extend({
      defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md' },
      classNames: { table: 'app-table' },
    }),
    Tabs: Tabs.extend({ classNames: { tab: 'app-tab' } }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { radius: 'sm', withItemsBorders: false },
      classNames: { root: 'app-segmented', label: 'app-segmented-label' },
    }),
    Modal: Modal.extend({
      defaultProps: { radius: 'lg', overlayProps: { backgroundOpacity: 0.35, blur: 3 } },
      classNames: { title: 'app-modal-title', content: 'app-modal-content' },
    }),
    Menu: Menu.extend({
      defaultProps: { radius: 'md', shadow: 'lg' },
      classNames: { dropdown: 'app-menu' },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: { radius: 'sm', openDelay: 250, withArrow: true, arrowSize: 6 },
    }),
    Alert: Alert.extend({ defaultProps: { radius: 'md' } }),
    Progress: Progress.extend({ defaultProps: { radius: 'xl' } }),
    NavLink: NavLink.extend({ classNames: { root: 'app-navlink' } }),
    Anchor: Anchor.extend({
      defaultProps: { underline: 'hover' },
      classNames: { root: 'app-anchor' },
    }),
  },
});
