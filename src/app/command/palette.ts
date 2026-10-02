import { createSpotlight } from '@mantine/spotlight';

/** The command palette's store: open it from anywhere with `palette.open()`. */
export const [paletteStore, palette] = createSpotlight();

export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The platform's command key, as shown in hints. */
export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

/** "g" then a letter jumps to a screen, as in Linear and GitHub. */
export const GO_SHORTCUTS = [
  { key: 'o', to: '/', label: 'Overview' },
  { key: 'i', to: '/irrigation', label: 'Irrigation' },
  { key: 'w', to: '/water', label: 'Water' },
  { key: 'n', to: '/infrastructure', label: 'Infrastructure' },
  { key: 'm', to: '/maintenance', label: 'Maintenance' },
  { key: 'a', to: '/alerts', label: 'Alerts' },
  { key: 'b', to: '/intelligence', label: 'Farm intelligence (briefing)' },
  { key: 'f', to: '/farms', label: 'Farms & fields' },
  { key: 'd', to: '/devices', label: 'Devices & sensors' },
] as const;

/** Screen actions a command can open: a page reads `?do=` and opens the matching dialog. */
export type PageCommand =
  'log-irrigation' | 'plan-irrigation' | 'new-work-order' | 'new-asset' | 'register-device';
