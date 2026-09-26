# IrrigaIQ Web

The IrrigaIQ dashboard: every operational function of the platform plus the administration
console. Talks exclusively to [IrrigaIQ-Backend](https://github.com/campbellshava0310/IrrigaIQ-Backend).

**Stack:** React 19 · TypeScript 6 · Vite 8 · React Router 8 · TanStack Query 5 · Mantine 9 ·
Mantine Charts (Recharts) · Zod 4 · Vitest 5

Product and UX decisions (who the screens are for, why they look the way they do) are in
[docs/product-and-ux.md](docs/product-and-ux.md).

## Quick start

Prerequisites: Node 22.22+ (`.nvmrc` pins 24), the backend running on `http://localhost:8080`.

```bash
npm install
npm run dev      # http://localhost:5173
```

Sign in with the bootstrap admin from the backend's `.env` (default `admin@irrigaiq.local`), or
create a farm-manager account on the registration screen. To explore every screen with realistic
data, use **Admin overview → Demo farm** (or **Load the demo farm** on an empty account).

The dev server proxies `/api` and `/actuator/health` to the backend, so the browser sees one
origin. This is what lets the `SameSite=Strict` refresh cookie work, and it mirrors production,
where nginx does the same. Point the proxy elsewhere with `VITE_API_PROXY_TARGET` (see
`.env.example`).

## Scripts

| Command                                                       | Purpose                                             |
| ------------------------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                                 | Dev server with HMR                                 |
| `npm run build`                                               | Typecheck + production build (`dist/`)              |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | Static checks (all run in CI)                       |
| `npm test`                                                    | Unit and component tests (Vitest + Testing Library) |

## Structure

```
src/
  app/          providers, router, layouts (AppShell, auth), navigation, theme
  components/   shared UI: page header, stat cards, loading/error/empty states, status pages
  config/       public runtime configuration
  lib/
    api/        the HTTP client (auth + refresh + error mapping) and ApiError
    auth/       session store, auth endpoints, types
  features/     one folder per domain: api hooks, types, presentation, components, pages
    auth · dashboard · farms · irrigation · water · infrastructure · maintenance · alerts ·
    intelligence · account · admin
  styles/
    app.css     surface system: canvas, cards, borders, shadows, sidebar, auth (light and dark)
    viz.css     chart colour tokens (light and dark)
```

Rules of the road:

- Feature code calls the API only through `@/lib/api/client` (enforced by ESLint), so every
  request is authenticated, refreshed and error-mapped the same way.
- Server state lives in TanStack Query, with a key factory per feature. Everything computed from a
  farm's operations lives under one `farmOps(farmId)` key, and every write invalidates that scope:
  an irrigation moves the water balance, alerts, water totals and dashboard at once.
- Operations screens work on the **current farm** (sidebar switcher, remembered per browser);
  detail routes carry the farm id so links can be shared, and switch the selector to match.
- Each feature's `presentation.ts` maps states to label, colour and icon in one place, so a
  status reads the same everywhere and colour never carries meaning alone.
- Forms use `@mantine/form` + Zod via Standard Schema; server-side field errors are mapped back
  onto inputs with `applyServerErrors`.
- Admin routes and the chart pages are lazily loaded; Recharts has its own vendor chunk and never
  loads on the first visit. Route guards are UX only: the API enforces every permission.
- Charts follow the data-viz rules in `styles/viz.css`: a validated colour-blind-safe palette with
  light and dark steps, one measure per axis (small multiples instead of dual axes), solid hairline
  grids, dashed lines only for thresholds, and a table view behind every chart.

## Design system

The look is set in two places: `src/app/theme.ts` (Mantine theme: brand and status colours,
Inter, type scale, radii, shadows, component defaults) and `src/styles/app.css` (surface tokens
and the classes the theme attaches). Build screens from these pieces rather than one-off styles:

- `PageHeader` (optional eyebrow, title, description, actions, back link) opens every page.
- `StatCard` is the only metric tile: icon badge, sentence-case label, value (with `unit`), hint,
  optional `to` link. Colour the icon by status and say why in the hint.
- Cards use `<Card withBorder>`; tables inside a card use `padding={0}` and
  `style={{ overflow: 'hidden' }}`. Rows or tiles inside a card use `.app-row` / `.app-tile`
  rather than nested bordered cards.
- Status is `<Badge variant="dot" color=…>` (a tinted pill with a dot) plus text. No coloured
  border strips, no uppercase micro labels.
- `LoadingState layout="page"` for first loads (skeletons shaped like the page), `EmptyState`
  and `ErrorState` for the rest.
- `brand` is the IrrigaIQ teal (actions, selection); `teal` is the success green.
- The Inter font is self-hosted (`@fontsource-variable/inter`), so it works under the
  production CSP.

## Authentication

- The access token is held **in memory only**; the refresh token is an `HttpOnly` cookie the page
  can't read. A reload restores the session with a silent refresh.
- On a 401 the client refreshes once and retries. Refreshes are single-flight within a tab and
  serialised across tabs with the Web Locks API, because the API rotates the refresh token on
  every use and would treat a stale replay as theft.
- Sign-in and sign-out are broadcast to all tabs (`BroadcastChannel`). Cached data is cleared
  when a session ends.

## Screens

| Area                    | What it does                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview                | Today's plan (prioritised tasks with one-click actions), key numbers, soil water per field, 7-day forecast, infrastructure watch, briefing headline                                           |
| Irrigation              | A recommendation card per field (what, how much, how long, when, why, confidence), schedule to confirm or skip, history; log irrigation, plan, soil check, irrigation system                  |
| Field                   | Water-balance charts (soil water vs refill point; rain, irrigation and crop use), season and yield at risk, model assumptions, log, soil checks, crops                                        |
| Water                   | Water saved vs a calendar schedule, applied vs crop need, energy and cost, per-field table, licensed allocations                                                                              |
| Infrastructure          | Asset list and water-network tree with health, risk and next service; asset page with health factors, service forecast, trend (energy per m³, filter ΔP, water level), checks and work orders |
| Maintenance             | Work-order board (to do, in progress, done) with start, complete (restarts the service clock), cancel, reopen                                                                                 |
| Alerts                  | Active and resolved alerts by severity and area: plan irrigation, create a work order, acknowledge, resolve, re-check now                                                                     |
| Farm intelligence       | The daily briefing, how each model decides, and what would make this farm's advice more accurate                                                                                              |
| Farms & fields, Account | Farm setup (location, tariff, savings baseline), fields and crops; profile, password, devices                                                                                                 |
| Admin                   | Overview, system health, users, audit log, demo farm                                                                                                                                          |

## Production image

```bash
docker build -t irrigaiq/web .
docker run -p 8080:8080 -e API_UPSTREAM=http://backend:8080 irrigaiq/web
```

Unprivileged nginx serves the SPA, reverse-proxies `/api`, and sets a strict CSP and other
security headers, immutable caching for hashed assets, and per-IP rate limiting on
`/api/v1/auth/*`.
