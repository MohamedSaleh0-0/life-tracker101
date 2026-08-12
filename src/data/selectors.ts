import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import type {
  Account,
  Habit,
  HabitLog,
  Metric,
  MetricLog,
  PeriodKey,
  Transaction,
} from "./types";

export interface Range {
  from: Date;
  to: Date;
  label: string;
}

export function periodRange(period: PeriodKey, custom: { from: string; to: string }): Range {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), label: format(now, "EEEE d MMM") };
    case "week":
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
        label: "This week",
      };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now), label: format(now, "yyyy") };
    case "custom":
      return {
        from: startOfDay(parseISO(custom.from)),
        to: endOfDay(parseISO(custom.to)),
        label: `${format(parseISO(custom.from), "d MMM")} – ${format(parseISO(custom.to), "d MMM")}`,
      };
    case "month":
    default:
      return { from: startOfMonth(now), to: endOfMonth(now), label: format(now, "MMMM yyyy") };
  }
}

export const inRange = (iso: string, r: Range) => {
  const d = parseISO(iso);
  return d >= r.from && d <= r.to;
};

export function summarize(txs: Transaction[], r: Range) {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (!inRange(t.date, r)) continue;
    if (t.type === "income") income += t.amount;
    if (t.type === "expense") expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export const totalBalance = (accounts: Account[]) =>
  accounts.reduce((sum, a) => sum + a.balance, 0);

export function byCategory(txs: Transaction[], r: Range, type: "expense" | "income") {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type || !inRange(t.date, r)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Buckets income/expense into day or month depending on range length. */
export function flowSeries(txs: Transaction[], r: Range) {
  const days = differenceInCalendarDays(r.to, r.from) + 1;
  const byMonth = days > 62;
  const map = new Map<string, { key: string; income: number; expenses: number }>();
  const keyFor = (d: Date) => (byMonth ? format(d, "yyyy-MM") : format(d, "yyyy-MM-dd"));
  for (const d of eachDayOfInterval({ start: r.from, end: r.to })) {
    const k = keyFor(d);
    if (!map.has(k)) map.set(k, { key: k, income: 0, expenses: 0 });
  }
  for (const t of txs) {
    if (!inRange(t.date, r)) continue;
    const k = keyFor(parseISO(t.date));
    const row = map.get(k);
    if (!row) continue;
    if (t.type === "income") row.income += t.amount;
    if (t.type === "expense") row.expenses += t.amount;
  }
  return [...map.values()].map((row) => ({
    ...row,
    label: byMonth
      ? format(parseISO(`${row.key}-01`), "MMM")
      : format(parseISO(row.key), days > 14 ? "d MMM" : "EEE d"),
    income: Math.round(row.income * 100) / 100,
    expenses: Math.round(row.expenses * 100) / 100,
  }));
}

/** Walks backwards from today's balances to reconstruct net worth history. */
export function netWorthSeries(accounts: Account[], txs: Transaction[], days = 180) {
  const current = totalBalance(accounts);
  const netByDay = new Map<string, number>();
  for (const t of txs) {
    if (t.type === "transfer") continue;
    const delta = t.type === "income" ? t.amount : -t.amount;
    netByDay.set(t.date, (netByDay.get(t.date) ?? 0) + delta);
  }
  const out: Array<{ date: string; label: string; value: number }> = [];
  let running = current;
  for (let i = 0; i < days; i++) {
    const day = subDays(new Date(), i);
    const iso = format(day, "yyyy-MM-dd");
    out.push({ date: iso, label: format(day, "d MMM"), value: Math.round(running) });
    running -= netByDay.get(iso) ?? 0;
  }
  return out.reverse();
}

/* ---------------- habits ---------------- */

export function isScheduled(h: Habit, date: Date) {
  if (h.schedule.type === "weekdays") return (h.schedule.days ?? []).includes(date.getDay());
  return true; // daily and timesPerWeek are both "open" every day
}

export const logFor = (logs: HabitLog[], habitId: string, iso: string) =>
  logs.find((l) => l.habitId === habitId && l.date === iso);

export function isComplete(h: Habit, log?: HabitLog) {
  if (!log) return false;
  if (h.kind === "bool") return log.value >= 1;
  return log.value >= (h.target ?? 1);
}

export function streak(h: Habit, logs: HabitLog[]) {
  let current = 0;
  let longest = 0;
  let run = 0;
  for (let i = 120; i >= 0; i--) {
    const day = subDays(new Date(), i);
    if (!isScheduled(h, day)) continue;
    const iso = format(day, "yyyy-MM-dd");
    const done = isComplete(h, logFor(logs, h.id, iso));
    if (done) {
      run++;
      longest = Math.max(longest, run);
    } else if (i !== 0) {
      run = 0;
    }
  }
  current = run;
  return { current, longest };
}

export function consistencyGrid(h: Habit, logs: HabitLog[], weeks = 12) {
  const totalDays = weeks * 7;
  const start = startOfWeek(subDays(new Date(), totalDays - 1), { weekStartsOn: 1 });
  const cells: Array<{ iso: string; state: "done" | "missed" | "off" | "future"; ratio: number }> =
    [];
  const end = new Date();
  for (let i = 0; ; i++) {
    const day = addDays(start, i);
    if (day > addDays(end, 6 - ((end.getDay() + 6) % 7))) break;
    const iso = format(day, "yyyy-MM-dd");
    if (day > end) {
      cells.push({ iso, state: "future", ratio: 0 });
      continue;
    }
    if (!isScheduled(h, day)) {
      cells.push({ iso, state: "off", ratio: 0 });
      continue;
    }
    const log = logFor(logs, h.id, iso);
    const ratio =
      h.kind === "bool"
        ? log && log.value >= 1
          ? 1
          : 0
        : Math.min(1, (log?.value ?? 0) / (h.target ?? 1));
    cells.push({ iso, state: ratio >= 1 ? "done" : "missed", ratio });
  }
  return cells;
}

export function weeklyCompletion(h: Habit, logs: HabitLog[], weeks = 12) {
  const out: Array<{ label: string; rate: number }> = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const anchor = subDays(new Date(), w * 7);
    const from = startOfWeek(anchor, { weekStartsOn: 1 });
    let scheduled = 0;
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(from, i);
      if (day > new Date()) break;
      if (!isScheduled(h, day)) continue;
      scheduled++;
      if (isComplete(h, logFor(logs, h.id, format(day, "yyyy-MM-dd")))) done++;
    }
    out.push({
      label: format(from, "d MMM"),
      rate: scheduled ? Math.round((done / scheduled) * 100) : 0,
    });
  }
  return out;
}

export function habitValueSeries(h: Habit, logs: HabitLog[], days = 30) {
  const out: Array<{ label: string; value: number; target: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const iso = format(day, "yyyy-MM-dd");
    out.push({
      label: format(day, "d MMM"),
      value: logFor(logs, h.id, iso)?.value ?? 0,
      target: h.target ?? 1,
    });
  }
  return out;
}

export function overallConsistency(habits: Habit[], logs: HabitLog[], days = 30) {
  const out: Array<{ iso: string; label: string; rate: number; done: number; total: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const iso = format(day, "yyyy-MM-dd");
    const scheduled = habits.filter((h) => isScheduled(h, day));
    const done = scheduled.filter((h) => isComplete(h, logFor(logs, h.id, iso))).length;
    out.push({
      iso,
      label: format(day, "d MMM"),
      rate: scheduled.length ? done / scheduled.length : 0,
      done,
      total: scheduled.length,
    });
  }
  return out;
}

/* ---------------- metrics ---------------- */

export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h ?? 0) * 60 + Number(m ?? 0);
};

export const metricLogFor = (logs: MetricLog[], metricId: string, iso: string) =>
  logs.find((l) => l.metricId === metricId && l.date === iso);

export function metricSeries(m: Metric, logs: MetricLog[], days = 60) {
  const rows: Array<{ iso: string; label: string; value: number | null }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const iso = format(day, "yyyy-MM-dd");
    const log = metricLogFor(logs, m.id, iso);
    rows.push({
      iso,
      label: format(day, "d MMM"),
      value: typeof log?.value === "number" ? log.value : null,
    });
  }
  // 7-day rolling average
  return rows.map((row, idx) => {
    const window = rows
      .slice(Math.max(0, idx - 6), idx + 1)
      .map((r) => r.value)
      .filter((v): v is number => v !== null);
    return {
      ...row,
      avg: window.length ? Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10 : null,
    };
  });
}

export function metricStats(m: Metric, logs: MetricLog[]) {
  const values = logs
    .filter((l) => l.metricId === m.id && typeof l.value === "number")
    .map((l) => ({ date: l.date, value: l.value as number }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!values.length) return null;
  const nums = values.map((v) => v.value);
  const latest = values[values.length - 1]!;
  const prev = values.length > 7 ? values[values.length - 8]! : values[0]!;
  return {
    latest: latest.value,
    latestDate: latest.date,
    change: Math.round((latest.value - prev.value) * 10) / 10,
    min: Math.min(...nums),
    max: Math.max(...nums),
    avg: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10,
    count: values.length,
  };
}

export const formatMetricValue = (m: Metric, value: number | string) => {
  if (m.kind === "time" && typeof value === "number") return minutesToTime(value);
  if (m.kind === "number" && typeof value === "number")
    return `${value}${m.unit ? ` ${m.unit}` : ""}`;
  return String(value);
};

export const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const currency2 = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
