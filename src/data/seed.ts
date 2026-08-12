import { addDays, format, subDays } from "date-fns";
import type {
  Account,
  Habit,
  HabitLog,
  Metric,
  MetricLog,
  Recurring,
  ShoppingList,
  Transaction,
} from "./types";

/** Deterministic pseudo-random so the sample data is stable between renders. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const d = (date: Date) => format(date, "yyyy-MM-dd");
export const today = () => d(new Date());

export const accounts: Account[] = [
  { id: "acc-checking", name: "Everyday Checking", type: "checking", balance: 4820.4 },
  { id: "acc-savings", name: "Emergency Savings", type: "savings", balance: 14250 },
  { id: "acc-credit", name: "Visa Credit", type: "credit", balance: -1183.62 },
  { id: "acc-cash", name: "Cash Wallet", type: "cash", balance: 215 },
];

const expenseCatalog: Array<[string, string[], number, number]> = [
  ["Groceries", ["Whole Foods", "Corner Market", "Trader Joe's"], 28, 120],
  ["Dining", ["Ramen Bar", "Cafe Lento", "Taqueria 7"], 12, 60],
  ["Transport", ["Metro card", "Uber", "Fuel"], 6, 55],
  ["Housing", ["Utilities", "Internet"], 40, 130],
  ["Health", ["Pharmacy", "Gym day pass", "Physio"], 15, 90],
  ["Subscriptions", ["Spotify", "iCloud", "Figma"], 5, 25],
  ["Shopping", ["Uniqlo", "Bookstore", "Hardware store"], 18, 160],
  ["Entertainment", ["Cinema", "Concert", "Game"], 12, 70],
];

const incomeCatalog: Array<[string, string, number, number]> = [
  ["Salary", "Monthly salary — Northwind", 4200, 4200],
  ["Freelance", "Client retainer — Alba Studio", 300, 950],
  ["Interest", "Savings interest", 8, 22],
];

function buildTransactions(): Transaction[] {
  const rand = rng(20260812);
  const txs: Transaction[] = [];
  const start = subDays(new Date(), 182);
  let n = 0;

  for (let i = 0; i <= 182; i++) {
    const day = addDays(start, i);
    const iso = d(day);

    // Salary on the 1st, freelance mid-month
    if (day.getDate() === 1) {
      txs.push({
        id: `tx-${n++}`,
        date: iso,
        type: "income",
        amount: 4200,
        accountId: "acc-checking",
        category: "Salary",
        note: incomeCatalog[0]![1],
      });
      txs.push({
        id: `tx-${n++}`,
        date: iso,
        type: "expense",
        amount: 1650,
        accountId: "acc-checking",
        category: "Housing",
        note: "Rent",
      });
      txs.push({
        id: `tx-${n++}`,
        date: iso,
        type: "transfer",
        amount: 600,
        accountId: "acc-checking",
        toAccountId: "acc-savings",
        category: "Transfer",
        note: "Auto-save",
      });
    }
    if (day.getDate() === 14) {
      txs.push({
        id: `tx-${n++}`,
        date: iso,
        type: "income",
        amount: 420 + Math.round(rand() * 520),
        accountId: "acc-checking",
        category: "Freelance",
        note: incomeCatalog[1]![1],
      });
    }
    if (day.getDate() === 28) {
      txs.push({
        id: `tx-${n++}`,
        date: iso,
        type: "income",
        amount: 9 + Math.round(rand() * 12),
        accountId: "acc-savings",
        category: "Interest",
        note: incomeCatalog[2]![1],
      });
    }

    const count = rand() < 0.25 ? 0 : 1 + Math.floor(rand() * 3);
    for (let k = 0; k < count; k++) {
      const [category, merchants, lo, hi] =
        expenseCatalog[Math.floor(rand() * expenseCatalog.length)]!;
      const note = merchants[Math.floor(rand() * merchants.length)]!;
      const amount = Math.round((lo + rand() * (hi - lo)) * 100) / 100;
      const accountId =
        rand() < 0.55 ? "acc-credit" : rand() < 0.75 ? "acc-checking" : "acc-cash";
      txs.push({
        id: `tx-${n++}`,
        date: iso,
        type: "expense",
        amount,
        accountId,
        category,
        note,
      });
    }
  }
  return txs.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const transactions: Transaction[] = buildTransactions();

export const recurring: Recurring[] = [
  {
    id: "rec-rent",
    name: "Rent — Apt 4B",
    type: "expense",
    amount: 1650,
    accountId: "acc-checking",
    category: "Housing",
    dueDate: d(addDays(new Date(), 3)),
    cadence: "Monthly",
    status: "pending",
  },
  {
    id: "rec-salary",
    name: "Salary — Northwind",
    type: "income",
    amount: 4200,
    accountId: "acc-checking",
    category: "Salary",
    dueDate: d(addDays(new Date(), 5)),
    cadence: "Monthly",
    status: "pending",
  },
  {
    id: "rec-gym",
    name: "Gym membership",
    type: "expense",
    amount: 46,
    accountId: "acc-credit",
    category: "Health",
    dueDate: d(addDays(new Date(), 1)),
    cadence: "Monthly",
    status: "pending",
  },
  {
    id: "rec-figma",
    name: "Figma Pro",
    type: "expense",
    amount: 15,
    accountId: "acc-credit",
    category: "Subscriptions",
    dueDate: d(new Date()),
    cadence: "Monthly",
    status: "pending",
  },
  {
    id: "rec-internet",
    name: "Fibre internet",
    type: "expense",
    amount: 55,
    accountId: "acc-checking",
    category: "Housing",
    dueDate: d(subDays(new Date(), 2)),
    cadence: "Monthly",
    status: "pending",
  },
];

export const habits: Habit[] = [
  {
    id: "h-water",
    name: "Drink water",
    kind: "count",
    target: 8,
    unit: "glasses",
    accent: "metric",
    schedule: { type: "daily" },
  },
  {
    id: "h-read",
    name: "Read 20 pages",
    kind: "bool",
    accent: "habit",
    schedule: { type: "daily" },
  },
  {
    id: "h-train",
    name: "Strength training",
    kind: "bool",
    accent: "finance",
    schedule: { type: "weekdays", days: [1, 3, 5] },
  },
  {
    id: "h-steps",
    name: "Walk",
    kind: "count",
    target: 8000,
    unit: "steps",
    accent: "habit",
    schedule: { type: "daily" },
  },
  {
    id: "h-meditate",
    name: "Meditate",
    kind: "bool",
    accent: "metric",
    schedule: { type: "timesPerWeek", times: 4 },
  },
  {
    id: "h-nosugar",
    name: "No added sugar",
    kind: "bool",
    accent: "finance",
    schedule: { type: "daily" },
  },
];

function buildHabitLogs(): HabitLog[] {
  const rand = rng(778899);
  const logs: HabitLog[] = [];
  const start = subDays(new Date(), 89);
  for (let i = 0; i <= 89; i++) {
    const day = addDays(start, i);
    const iso = d(day);
    const isToday = i === 89;
    for (const h of habits) {
      if (h.schedule.type === "weekdays" && !h.schedule.days?.includes(day.getDay())) continue;
      const p = h.id === "h-nosugar" ? 0.62 : h.id === "h-meditate" ? 0.55 : 0.78;
      const hit = rand() < p;
      if (isToday) {
        // leave most of today open so the dashboard has things to do
        if (h.id === "h-water") logs.push({ habitId: h.id, date: iso, value: 5 });
        if (h.id === "h-read") logs.push({ habitId: h.id, date: iso, value: 1 });
        continue;
      }
      if (h.kind === "bool") {
        if (hit) logs.push({ habitId: h.id, date: iso, value: 1 });
      } else {
        const target = h.target ?? 1;
        const value = hit
          ? Math.round(target * (0.9 + rand() * 0.35))
          : Math.round(target * (0.3 + rand() * 0.5));
        logs.push({ habitId: h.id, date: iso, value });
      }
    }
  }
  return logs;
}

export const habitLogs: HabitLog[] = buildHabitLogs();

export const metrics: Metric[] = [
  { id: "m-weight", name: "Weight", kind: "number", unit: "kg", targetMin: 72, targetMax: 76 },
  { id: "m-sleep", name: "Sleep duration", kind: "number", unit: "h", targetMin: 7, targetMax: 9 },
  { id: "m-wake", name: "Wake-up time", kind: "time" },
  { id: "m-note", name: "Day note", kind: "text" },
];

const notes = [
  "Deep work morning, slow afternoon.",
  "Long walk by the river after dinner.",
  "Felt scattered — too many meetings.",
  "Good energy, cooked at home.",
  "Late night, paid for it today.",
  "Quiet day. Read on the balcony.",
];

function buildMetricLogs(): MetricLog[] {
  const rand = rng(4242);
  const logs: MetricLog[] = [];
  const start = subDays(new Date(), 89);
  let weight = 78.4;
  for (let i = 0; i <= 89; i++) {
    const iso = d(addDays(start, i));
    const isToday = i === 89;
    weight += (rand() - 0.62) * 0.28;
    if (!isToday) logs.push({ metricId: "m-weight", date: iso, value: Math.round(weight * 10) / 10 });
    if (rand() > 0.06 && !isToday)
      logs.push({
        metricId: "m-sleep",
        date: iso,
        value: Math.round((6 + rand() * 2.6) * 10) / 10,
      });
    if (rand() > 0.08)
      logs.push({
        metricId: "m-wake",
        date: iso,
        value: Math.round(345 + rand() * 90), // 05:45 – 07:15
      });
    if (rand() > 0.55 && !isToday)
      logs.push({
        metricId: "m-note",
        date: iso,
        value: notes[Math.floor(rand() * notes.length)]!,
      });
  }
  return logs;
}

export const metricLogs: MetricLog[] = buildMetricLogs();

export const shoppingLists: ShoppingList[] = [
  {
    id: "list-groceries",
    name: "Weekly groceries",
    items: [
      { id: "si-1", name: "Oat milk", qty: 2, estPrice: 3.4 },
      { id: "si-2", name: "Chicken thighs", qty: 1, estPrice: 11.5 },
      { id: "si-3", name: "Spinach", qty: 1, estPrice: 2.9 },
      { id: "si-4", name: "Sourdough loaf", qty: 1, estPrice: 5.2 },
      { id: "si-5", name: "Greek yoghurt", qty: 2, estPrice: 4.1 },
      {
        id: "si-6",
        name: "Coffee beans",
        qty: 1,
        estPrice: 14,
        purchasedOn: d(subDays(new Date(), 4)),
        paidPrice: 15.2,
      },
      {
        id: "si-7",
        name: "Olive oil",
        qty: 1,
        estPrice: 9.5,
        purchasedOn: d(subDays(new Date(), 4)),
        paidPrice: 8.9,
      },
    ],
  },
  {
    id: "list-home",
    name: "Apartment fixes",
    items: [
      { id: "si-8", name: "LED bulbs (4-pack)", qty: 1, estPrice: 12 },
      { id: "si-9", name: "Shower curtain", qty: 1, estPrice: 18 },
      { id: "si-10", name: "Picture hooks", qty: 3, estPrice: 2.5 },
      {
        id: "si-11",
        name: "Drill bits",
        qty: 1,
        estPrice: 22,
        purchasedOn: d(subDays(new Date(), 11)),
        paidPrice: 24.99,
      },
    ],
  },
];
