# Life Tracker — unified personal dashboard

A dark-only personal analytics app where money, habits, and metrics are peers — one shared visual language, one shared time-range control.

## Visual direction

- Near-black layered surfaces (deep charcoal base, slightly lifted cards, hairline borders), no pure black, no light mode.
- One cool accent for finance, one warm accent for habits, one neutral-cyan for metrics — used as data-ink only (chart strokes, streak rings, state dots), not as button candy.
- Condensed grotesk headings + tabular-figure body font so numbers align in columns.
- Dense, instrument-panel feel: tight rows, small caps labels, generous numeric hierarchy. Sharp-ish radius, minimal shadow, restrained motion (value counters, ring fills, row hover only).

## Information architecture

Left rail navigation (icon + label), sticky top bar with a global period selector (Today / Week / Month / Year / Custom) plus one "Log" button that opens a chooser for Expense / Income / Transfer / Habit / Metric.

Routes:

- `/` Today — the daily cockpit: today's habit checklist with streak rings, today's metric slots (weight, wake-up time, sleep), quick balance + spent-today strip, bills due this week, active shopping list preview.
- `/finance` — KPI row (balance, income, expenses, net for the selected period), income vs expenses chart, net worth over time, expenses by category, income by source, account balance bars, upcoming recurring items with confirm/skip.
- `/transactions` — full searchable/filterable history (text search, account, category, type, date range), grouped by day with running totals.
- `/lists` — multiple shopping lists, pending items with estimated prices and list subtotal, check-off flow that moves items into that list's purchase history.
- `/habits` — all habits, today's state, streak + consistency heatmap per habit, per-habit detail with completion rate over time.
- `/metrics` — all metrics, sparkline cards, detail view with trend line, rolling average, min/max/latest for numeric and time-of-day types; text metrics show a log timeline.

## Trends (the priority gap)

- Habit consistency: 12-week contribution-style grid per habit, plus a weekly completion-rate line and current/longest streak. For target-based habits (8 glasses), a bar chart of value vs target.
- Metric trends: line chart with 7-day rolling average; time-of-day metrics plot on a clock-hour axis (wake-up time) instead of a raw number axis.
- A combined "consistency" strip on the Today page showing the last 30 days across all habits.

## Logging modals

Shared modal shell, each opens from anywhere:

- Expense / Income: amount keypad-style field, account, category, date, note.
- Transfer: from-account → to-account, amount, date.
- Habit log: check-off for boolean, stepper/slider for target-based (with target shown).
- Metric log: input adapts to type — number with unit, time picker, or text.
- New habit (guided, 3 steps): name + icon/color → type (yes/no or number vs target) → schedule (daily, specific weekdays, N times per week).
- New metric (guided): name + unit → type (number / time of day / text) → optional target range.

Logged-today state: the row/card switches to a filled "done" treatment with the logged value shown and a pencil affordance that reopens the same modal pre-filled for editing.

## Sample data

Seeded in-memory (no auth, no backend): 4 accounts (checking, savings, credit card, cash) with ~60 transactions over 6 months across realistic categories, 5 recurring items (rent, salary, subscriptions) with some due for review, 6 habits with 12 weeks of varied history including broken streaks, 4 metrics (weight, sleep duration, wake-up time, mood note) with daily history, and 2 shopping lists with pending items and purchase history.

## Technical notes

- TanStack Start file routes as listed; shared app shell (rail + top bar + modal host) in `__root.tsx`.
- Dark-only tokens defined in `src/styles.css` under `:root`; no `.dark` toggle, no light values.
- Sample data in `src/data/*.ts` (pure TS fixtures + derived selectors); app state held in a React context store so logging from any modal updates every view live. No database — data resets on reload.
- Charts with Recharts, themed via CSS variables so no hardcoded colors.
- Per-route `head()` metadata with distinct titles/descriptions.

## Not included

Light mode, authentication, onboarding, persistence across reloads.
