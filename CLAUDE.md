# IrrigaIQ Web: working notes

React 19, TypeScript **6** (not 7: typescript-eslint requires <6.1), Vite **8** (Rolldown),
React Router **8** (import from `react-router`, `RouterProvider` from `react-router/dom`),
Mantine **9** (`c=` not `color=` on Text, `schemaResolver` from `@mantine/form` for Zod 4, `Grid gap`).

- Call the API only through `http` in `@/lib/api/client` (ESLint enforces it). Errors are `ApiError`.
- One folder per feature under `src/features/<name>/` with `api.ts` (query-key factory + hooks),
  `types.ts`, `components/` and `pages/`. Register routes in `src/app/router.tsx` and sidebar
  items in `src/app/navigation.ts`.
- Never store tokens in web storage; the session store keeps the access token in memory.
- Forms: `useForm` + Zod schema via `schemaResolver(schema, { sync: true })`, with
  `applyServerErrors` for API validation errors.
- Farm-scoped server state lives under `farmOps(farmId)` (`@/lib/api/farmScope`); writes
  invalidate the whole scope. Screens get the farm from `useCurrentFarm()` / `<RequireFarm>`.
- State → label/colour/icon mappings live in each feature's `presentation.ts`.
- Import charts from `@/lib/charts`, never `@mantine/charts` directly: that file loads the chart
  CSS, and keeping Recharts behind lazy routes keeps it off the first load. In `vite.config.ts` the
  `vendor-mantine` group must stay before `vendor-charts` (groups pull in dependencies).
- Chart colours come from `src/styles/viz.css` tokens; one measure per axis, table view per chart.
- Visual system: theme in `src/app/theme.ts`, surfaces in `src/styles/app.css` (see README,
  "Design system"). Use `PageHeader` (one-line description, `help` for the rest),
  `MetricStrip`/`Metric` with `Delta` and `TrendLine` for headline numbers (no icon tiles),
  `FilterBar`/`FilterMenu`/`SavedViewsMenu` for list filters, `useSort`/`SortTh` and
  `.app-table-scroll` + `stickyHeader` for tables, `chartTooltip()` for chart tooltips,
  `Card withBorder`, `Badge variant="dot"` for status, `LoadingState layout="page"` for first
  loads. Card titles are `h2` (16 px); only weights 400/500/600. Colours are semantic: `brand` = deep
  forest (primary, crop/soil), `teal` = water, `blue` = AI/info/rain, `green` = healthy,
  `yellow` = warning, `orange` = serious, `red` = critical; never `violet`. Flat colour only (no
  gradients), no coloured border strips, no `tt="uppercase"` labels, no nested bordered cards
  (use `.app-row` / `.app-tile`); AI content goes in `.app-ai`.
- Mantine renders the default Button variant without `data-variant`; CSS aimed at filled buttons
  must also match `:not([data-variant])`.
- Command palette and shortcuts live in `src/app/command`. A palette action that opens a dialog
  navigates to `?do=<command>`; the page reads it with `usePageCommand()` and derives the
  dialog's open state from it.
- AI surfaces: the assistant is called IrrigaIQ and its entry points say "Ask IrrigaIQ"; the
  launcher (`AskLauncher`) is fixed bottom right on every page, not in the sidebar. Open it from
  anywhere with `assistant.open(question?)`
  (`features/assistant/store`); answers stream as SSE over `http` (XHR progress events). ML views
  (`features/ml`) carry `available`: when a model is offline, show the rule-based result alone and
  say so. Model output wears `.app-ai`; anomaly wording stays hedged ("possible", never "leak").
- Mutations that change a list the user is looking at update the cache optimistically
  (`onMutate` snapshot, `onError` rollback, `onSettled` invalidate the farm scope).

Verify with `npm run lint && npm run typecheck && npm test && npm run build` (and
`npm run format:check`).
