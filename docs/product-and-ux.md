# IrrigaIQ: product and UX decisions

IrrigaIQ helps farms irrigate less and grow more, and keeps the water infrastructure running.
This note explains who the screens are for and the decisions behind them, so future work (sensors,
trained models) extends the product instead of reshaping it.

## Who uses it, and for what

| Person                      | Where                        | Jobs                                                                                                                                                   |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Farm manager / owner**    | Office or phone, daily       | Decide what gets irrigated today and when; keep yield on track; control water and energy cost; stay within the water permit; approve maintenance spend |
| **Irrigation supervisor**   | In the field, phone          | Run the plan; record what actually ran; check soil moisture; confirm or skip planned runs                                                              |
| **Maintenance technician**  | Pump house and fields, phone | Walk-round condition checks; report breakdowns; see which assets are drifting before they fail                                                         |
| **Agronomist / consultant** | Office, occasionally         | Understand and trust the recommendations; tune the irrigation system parameters                                                                        |
| **Administrator**           | Office                       | Accounts, access, audit; demo farms for training                                                                                                       |

The web dashboard is the planning and analysis tool; the mobile app is the field tool. Both read
the same recommendations, so the office and the field never disagree.

## Context that shaped the design

- **Power, not just water, constrains irrigation.** Scheduled load-shedding means grid pumps run in
  known windows (often at night), and solar pumps only in daylight. Every recommendation is
  scheduled inside the pump's window and split into several runs when it does not fit, with the
  energy cost shown.
- **Sensors are not there yet.** The product must be useful on day one, from the weather forecast
  and what the team records. Every screen therefore shows how confident the advice is and what
  would improve it (a soil check, the farm's coordinates, a measured application rate).
- **Failures cost harvests.** A pump that fails in the dry season can cost a crop, so the
  infrastructure side looks for slow signals (energy per m³ creeping up, filter pressure drop
  rising, a falling water table) and turns them into work orders before the failure.
- **Phones in the field, often in bright sun and with gloves.** Large touch targets, short forms
  with quick choices, and text labels on every colour.

## Information architecture

Operations screens are scoped to one farm, chosen in the farm switcher at the top of the sidebar
(web) or on the Today tab (mobile) and remembered per device.

| Web                           | Mobile       | Question it answers                                                        |
| ----------------------------- | ------------ | -------------------------------------------------------------------------- |
| Overview                      | Today        | What needs doing today, in what order?                                     |
| Irrigation (+ field page)     | Fields       | Which fields need water, how much, when, and why?                          |
| Water                         | (Today KPIs) | Are we using the right amount of water, and what is it saving and costing? |
| Infrastructure (+ asset page) | Assets       | What is at risk of failing, and what should we do about it?                |
| Maintenance                   | (Asset page) | What work is open, who is doing it, what did it cost?                      |
| Alerts                        | Alerts       | What changed that needs attention?                                         |
| Farm intelligence             |              | What is the situation in plain words, and how does IrrigaIQ decide?        |

## Design decisions

1. **Lead with the decision, then the numbers, then the reasons.** Each field card says "Irrigate
   today", then apply 42 mm, 844 m³, 14 h 5 min from 22:00 in 3 runs, then the reasons and
   confidence behind a disclosure. Experienced users act on the first line; sceptical users can
   check the working.
2. **Soil water as a tank, not "depletion".** FAO-56 tracks depletion (0 = full), but people
   read "how full" faster. Meters and charts show soil water available (100% = full) with a
   **refill point** marker where the crop starts to stress; the FAO term is in the tooltip.
3. **One tap from insight to action.** Plan the recommended irrigation from the card, confirm a
   planned run with "Done", turn an infrastructure alert into a prioritised work order, and book
   an overdue service from the asset or the Today list. Forms are pre-filled from the diagnosis.
4. **Farmer-friendly measurements.** Soil checks use the feel-and-appearance method (squeeze a
   handful: wet, moist, slightly moist, dry, very dry), with an exact percentage for probe users.
   Logging a run offers "just finished / this morning / last night / yesterday" and common
   durations, because most runs are logged after the fact.
5. **Honest confidence.** High, medium or low, with the reason ("live weather, but no soil check
   this week"). Farm Intelligence lists what would raise it on this farm, with a link to fix each.
6. **Explainable health scores.** Asset health starts at 100 and every deduction is listed with
   its evidence and the action that recovers it. No black box, so a technician can argue with it,
   and it gives a baseline to compare trained models against.
7. **Colour carries meaning, never alone.** One status scale everywhere (red critical or
   stressed, terracotta act now, amber soon or moderate, green healthy, grey inactive), always
   with a text label. The rest of the palette is semantic and learned once: deep forest for the
   brand and for crops and soil, teal for water, blue for weather and AI. Charts use the same
   families (validated for colour-blind separation in light and dark), so green is always soil,
   teal always water and blue always rain.
8. **Charts that answer one question each.** The field page uses two aligned charts (soil water
   against the refill point; daily rain, irrigation and crop use) instead of one dual-axis chart,
   shades the forecast, labels thresholds, and has a table view. Filters sit in one row above the
   charts.
9. **Empty states teach the model.** A new farm explains what to add and why (soil type, crop,
   pumps and what feeds them); admins can load a demo farm to learn the product safely.
10. **Everything recoverable.** Planned runs are skipped (with a reason), not deleted; work
    orders can be reopened; resolving an alert silences it for 24 hours rather than forever.
11. **A calm, enterprise surface.** The web and mobile apps share one flat visual language, closer
    to a fintech or intelligence platform than a farm app: an off-white canvas, white cards with
    a soft-gray hairline, a deep-slate navigation, deep-forest primary actions, Inter type with
    tabular numbers, sentence-case labels, status as a dot pill and one metric card shape
    everywhere. No gradients, glass or neon. The day's most important task leads each overview
    as a "Next up" card, and AI-written insight is marked with a faint blue edge.

12. **Every number has context.** A headline figure is shown with how it moved against the
    previous period of the same length ("↘ 12% vs prior 7 days", or "7.6×" for large jumps),
    coloured only when the direction is good or bad news, and with a small trend line where the
    daily shape matters. A raw number on its own invites the question "is that good?".
13. **Fast for the people who use it every day.** ⌘K / Ctrl K finds any screen, field or asset
    and starts common tasks; `g` then a letter moves between screens; lists share one filter bar
    with saved views; tables sort and keep their header in view; alert and work-order changes
    apply instantly.

## What sensors and AI will add, without redesigning the screens

- Soil-moisture probes feed the same soil-water meter and chart with measured values; confidence
  becomes "measured".
- Flow meters replace estimated volumes; unexplained flow becomes a leak alert.
- Pump telemetry (flow, pressure, current) feeds the same health factors continuously, and a
  remaining-useful-life model adds a "likely to fail within N weeks" forecast to the asset page.
- Trained recommendation models report through the same `source` / `modelVersion` fields and can
  be compared side by side with the FAO-56 baseline before switching over.

## Accessibility and quality checklist

- Every meter has `role="meter"` / `progressbar` semantics with a spoken value; every icon-only
  button has a label; tables and charts are keyboard-reachable.
- Status is always text plus colour; chart palette validated for deuteranopia, protanopia and
  tritanopia in both themes.
- Layouts work from 320 px phones to wide desktops; tables scroll horizontally instead of
  squashing numbers.
- Loading keeps the previous data dimmed instead of flashing skeletons; errors show a request
  reference for support.
