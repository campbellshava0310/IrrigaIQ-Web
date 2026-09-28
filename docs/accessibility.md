# Accessibility audit

**Standard:** WCAG 2.2 AA, plus axe-core best practices.
**Last run:** 28 September 2026, web console on the `feature/irrigaiq-mvp` branch (before commit).
**Result:** 0 violations on 15 screens in light and dark mode, and in the command palette and
form dialogs.

## How it was audited

1. **Automated, in a real browser.** axe-core 4.13 was run against each screen with live demo-farm
   data, in both colour schemes: Overview, Irrigation, Water, Infrastructure, Maintenance, Alerts,
   Farm intelligence, Farms, a farm, a field, an asset, Admin overview, Users, Audit log and
   Account; then with a form dialog and the ⌘K palette open. Tags: `wcag2a`, `wcag2aa`,
   `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`. This covers colour contrast, which jsdom
   cannot measure.
2. **Automated, in CI.** `src/components/a11y.test.tsx` runs axe against the shared building
   blocks (sign-in, page header, metric strip, change and trend, filter bar and saved views,
   sortable headers, empty and error states) on every `npm test`. Contrast is excluded there.
3. **Design rules that prevent whole classes of issue.** Status is never colour alone (a text label
   or pill always says it), charts have table views, and every chart colour was validated for
   colour-blind separation (see `src/styles/viz.css`).

## What the first run found, and the fixes

| Issue (axe rule)                                                   | Where                                | Fix                                                                        |
| ------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------- |
| Text contrast 4.1:1 (`color-contrast`)                             | Sidebar section labels on deep slate | Label grey `#6E7C76` to `#7D8B85` (5.1:1)                                  |
| Headers with no text (`empty-table-header`)                        | Action columns in five tables        | Visually hidden "Actions" header text                                      |
| Skipped heading level (`heading-order`)                            | Card titles were `h3` under the `h1` | Card and section titles are `h2`; the theme's `h2` is the 16 px card title |
| Label on a plain element (`aria-prohibited-attr`)                  | Briefing tone icons                  | `role="img"` alongside the label                                           |
| Scroll area not keyboard reachable (`scrollable-region-focusable`) | Table views that scroll              | Scrolling viewports take focus and are named "Scrollable table"            |
| Button without a name (`button-name`)                              | Close button of every dialog         | Theme default `aria-label="Close"` on Modal                                |
| Two banners (`landmark-no-duplicate-banner`)                       | Collapsed phone header on desktop    | The header only renders on phone widths, where the sidebar is hidden       |

## Keyboard

- Everything is reachable by Tab, with a visible focus ring (Mantine `focusRing: 'auto'`).
- ⌘K / Ctrl K or `/` opens the command palette; arrow keys and Enter run a result.
- `g` then a letter moves between screens; `?` lists every shortcut. Shortcuts never fire while
  typing or while a dialog is open.
- Row actions that appear on hover also appear on keyboard focus, and always on touch screens.

## Still to do (needs people, not tools)

Automated tools catch roughly a third to a half of real accessibility problems. Before launch:

- A screen-reader pass (VoiceOver on macOS and iOS, TalkBack on Android) through the core tasks in
  the usability test plan.
- Zoom to 200% and 400% (reflow) on the Overview, Irrigation and Water screens.
- Test with at least one farm manager who uses assistive technology, if one can be recruited.
