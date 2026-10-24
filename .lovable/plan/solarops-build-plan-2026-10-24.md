# SolarOps — Build Plan

A premium dark-mode solar energy platform for Romanian prosumers and O&M teams. Given the scope, we build in phases. Phase 1 delivers a complete, clickable product running on realistic simulated fleet data, plus live weather (Open-Meteo). Later phases add accounts, saved data and real integrations.

## Visual direction
- Deep navy/charcoal backgrounds, glass cards, electric green + emerald + cyan accents, subtle blue for grid.
- Display font: Sora; body: Manrope; numbers in a mono font for a "control room" feel.
- Inspired by the uploaded references: Sankey-style energy flow, map-centric fleet view, alerts table with severity chips, large KPI tiles.
- Real solar photography (Unsplash) on landing, site cards, site detail and map popups.

## Phase 1 — Pages
1. **Landing (/)** — hero "Your Energy. One Intelligent View." over rooftop photo, animated counters, dashboard preview, sections: How it works, Prosumer features, O&M features, Optimization, Predictive maintenance, Inverter ecosystem (Huawei, SMA, Fronius, Victron, Growatt, SolarEdge), Why SolarOps, footer.
2. **Dashboard (/dashboard)** — 12 KPI cards, period selector (Today / 7d / 30d / Year / Custom), Recharts area/bar charts for solar, consumption, battery, grid.
3. **Fleet map (/map)** — Leaflet + OpenStreetMap, ~40 sites across Romania, status-coloured markers, clustering, rich popups, filters (region, type, manufacturer, capacity, status, priority).
4. **Sites (/sites, /sites/$id)** — photo cards with compare mode; detail page with specs, health score, actual vs expected chart, maintenance history, alerts, savings and losses.
5. **Energy flow (/flow)** — animated Solar / Home / Battery / Grid diagram with particles, kW values, time scrubber, balanced maths including losses.
6. **Battery (/battery)** — capacity, usable, SoC, power, time-to-full/empty (or "Not currently charging"), efficiency, health, trends; kWp vs utilization.
7. **Weather & forecast (/forecast)** — Open-Meteo live current, hourly, 7-day, irradiance; PVGIS-style expected yield clearly labelled as historical model; 24–48h production forecast.
8. **Finance (/finance)** — per-site costs, savings, export revenue, ROI, payback, underperformance losses; portfolio ranking; configurable tariffs; measured vs estimated labelled.
9. **Regulations (/regulations)** — explainer for compensare cantitativă / regularizare financiară, thresholds (Law 160/2026 200→400 kW flagged "verify"), rules-engine calculator, ANRE / legislatie.just.ro links, disclaimer.
10. **Recommendations (/recommendations)** — 24h colour timeline (best / moderate / expensive), suggestion cards, flexible-load manager (washer, boiler, heat pump, AC, EV).
11. **Notifications** — bell drawer in top bar + /notifications page: history, priorities, preferences, quiet hours, dedupe, browser push with permission; "Perfect time to use solar energy!" triggers from current vs forecast surplus.
12. **O&M (/operations)** — health scores, rule-based anomaly engine (weather-aware, persistence, data quality), alerts table with statuses New / Investigating / Scheduled / Resolved, technician assignment, tickets.

Shared app shell: collapsible sidebar + top bar with search, view switch (Prosumer / O&M), notifications.

## Later phases (after your approval of Phase 1)
- Lovable Cloud: logins, roles (prosumer vs technician), saved sites, tickets, preferences.
- Real inverter APIs, live PVGIS and OPCOM day-ahead prices via server functions.

## Technical details
- TanStack Start routes per page, each with its own head() metadata.
- Simulation module generating deterministic per-site time series; pure functions for energy balance, battery estimates, finance, compensation rules and anomaly detection, each covered by vitest tests.
- Leaflet + markercluster loaded client-only; Recharts for charts; Open-Meteo fetched from the browser with TanStack Query.
- Design tokens in src/styles.css (oklch), dark by default.
