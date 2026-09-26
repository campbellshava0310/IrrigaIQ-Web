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
  "Design system"). Use `PageHeader`, `StatCard`, `Card withBorder`, `Badge variant="dot"` for
  status, `LoadingState layout="page"` for first loads. `brand` = IrrigaIQ teal (primary),
  `teal` = success green. No coloured border strips, no `tt="uppercase"` labels, no nested
  bordered cards (use `.app-row` / `.app-tile`).
- Mantine renders the default Button variant without `data-variant`; CSS aimed at filled buttons
  must also match `:not([data-variant])`.

Verify with `npm run lint && npm run typecheck && npm test && npm run build` (and
`npm run format:check`).
