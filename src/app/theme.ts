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
  alpha,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core';

/*
 * IrrigaIQ palette: forest green for the brand, water teal, intelligence blue, a controlled status
 * scale, and green-tinted slate neutrals. Each scale puts its light-mode colour at shade 7 and a
 * lighter dark-mode colour at shade 6 (the primaryShade pair below); shade 4 is dark-mode text.
 *
 *   brand   #276D54 forest: logo, primary actions, navigation, crop and soil (shared with mobile)
 *   teal    #159A9C water: consumption, flow, volumes, savings
 *   blue    #3B82F6 intelligence: AI insights, information, weather and rain
 *   green   #2E8B57 healthy       yellow  #D99A24 warning (moderate, soon)
 *   orange  #CF6F35 serious (act now, high risk)       red  #C94B4B critical
 */
const brand: MantineColorsTuple = [
  '#ECF4EF',
  '#D6E8DD',
  '#AACFBA',
  '#7DB695',
  '#549E77',
  '#3C8C66',
  '#2F7D5B',
  '#276D54',
  '#1F5A46',
  '#174A3A',
];

const teal: MantineColorsTuple = [
  '#E6F6F6',
  '#CCEDED',
  '#9BDBDC',
  '#67C8CA',
  '#3EB8BA',
  '#2DAFB1',
  '#22A7A9',
  '#159A9C',
  '#0F7E80',
  '#0A6163',
];

const blue: MantineColorsTuple = [
  '#EFF6FF',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#7AB4FB',
  '#60A5FA',
  '#4B92F8',
  '#3B82F6',
  '#2563EB',
  '#1D4ED8',
];

const green: MantineColorsTuple = [
  '#EAF5EF',
  '#D0EADB',
  '#A3D5B8',
  '#74BF94',
  '#52AE7A',
  '#43A26D',
  '#389862',
  '#2E8B57',
  '#237047',
  '#185536',
];

const yellow: MantineColorsTuple = [
  '#FCF5E6',
  '#F8E8C5',
  '#F1D193',
  '#EABA5F',
  '#E6B04E',
  '#E2A73C',
  '#DEA130',
  '#D99A24',
  '#9A6B16',
  '#6E4C10',
];

const orange: MantineColorsTuple = [
  '#FCF0E9',
  '#F7DCCD',
  '#EFB899',
  '#E69466',
  '#DF8050',
  '#DA7644',
  '#D5723D',
  '#CF6F35',
  '#A1531F',
  '#773D17',
];

const red: MantineColorsTuple = [
  '#FBEDED',
  '#F5D5D5',
  '#EBAAAA',
  '#E08080',
  '#D96A6A',
  '#D35C5C',
  '#CE5353',
  '#C94B4B',
  '#A33A3A',
  '#7A2B2B',
];

/** Green-tinted slate: muted text #64736D, borders #DCE4E0, canvas #F7F9F7, ink #17201D. */
const gray: MantineColorsTuple = [
  '#F7F9F7',
  '#EEF2F0',
  '#E5EBE8',
  '#DCE4E0',
  '#C3CEC9',
  '#94A39D',
  '#64736D',
  '#4A5752',
  '#2F3A36',
  '#17201D',
];

/** Dark mode: canvas #0B1110, surface #111817, elevated #18211E, text #F1F5F3 / #9AA8A2. */
const dark: MantineColorsTuple = [
  '#F1F5F3',
  '#C9D3CF',
  '#9AA8A2',
  '#6E7C76',
  '#2F3D38',
  '#26332F',
  '#18211E',
  '#111817',
  '#0E1513',
  '#0B1110',
];

const ACCENTS = { brand, teal, blue, green, yellow, orange, red };

/**
 * Two adjustments to Mantine's generated colour variables:
 * - light mode: text in the lighter accents (water teal, amber, blue...) uses shade 8, so words
 *   stay readable on white while dots, icons and fills keep the canonical colour;
 * - dark mode: tints are a translucent wash of the accent (Mantine darkens shade 9, which vanishes
 *   on this near-black canvas) and tinted content uses shade 4 rather than near-white.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: Object.fromEntries(
    (['teal', 'blue', 'green', 'yellow', 'orange'] as const).map((name) => [
      `--mantine-color-${name}-text`,
      `var(--mantine-color-${name}-8)`,
    ]),
  ),
  dark: Object.fromEntries([
    ...Object.entries(ACCENTS).flatMap(([name, shades]) => [
      [`--mantine-color-${name}-light`, alpha(shades[6], 0.16)],
      [`--mantine-color-${name}-light-hover`, alpha(shades[6], 0.24)],
      [`--mantine-color-${name}-light-color`, `var(--mantine-color-${name}-4)`],
    ]),
    ['--mantine-color-gray-light', alpha(gray[5], 0.14)],
    ['--mantine-color-gray-light-hover', alpha(gray[5], 0.2)],
    ['--mantine-color-gray-light-color', 'var(--mantine-color-dark-1)'],
  ]),
});

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 7, dark: 6 },
  colors: { ...ACCENTS, gray, dark },
  white: '#FFFFFF',
  black: '#17201D',
  fontFamily:
    '"Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSizes: { xs: '12px', sm: '13.5px', md: '15px', lg: '17px', xl: '20px' },
  lineHeights: { xs: '1.45', sm: '1.5', md: '1.55', lg: '1.5', xl: '1.4' },
  radius: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  defaultRadius: 'sm',
  spacing: { xs: '8px', sm: '12px', md: '16px', lg: '24px', xl: '32px' },
  shadows: {
    xs: '0 1px 2px rgba(23, 32, 29, 0.04)',
    sm: '0 1px 2px rgba(23, 32, 29, 0.05)',
    md: '0 4px 12px -4px rgba(23, 32, 29, 0.08)',
    lg: '0 12px 28px -10px rgba(23, 32, 29, 0.16)',
    xl: '0 20px 44px -14px rgba(23, 32, 29, 0.22)',
  },
  // One scale: page title 28 (h1), card and section titles 16 (h2), sub-sections 15 (h3); larger
  // section headings set their size explicitly. Weights: 400 body, 500 labels, 600 headings and figures.
  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '28px', lineHeight: '1.2' },
      h2: { fontSize: '16px', lineHeight: '1.4' },
      h3: { fontSize: '15px', lineHeight: '1.4' },
      h4: { fontSize: '14px', lineHeight: '1.4' },
      h5: { fontSize: '13px', lineHeight: '1.4' },
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
      defaultProps: {
        radius: 'lg',
        overlayProps: { backgroundOpacity: 0.35, blur: 3 },
        closeButtonProps: { 'aria-label': 'Close' },
      },
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
