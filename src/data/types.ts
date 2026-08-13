export type AccountType = "checking" | "savings" | "credit" | "cash";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export type TxType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd
  type: TxType;
  amount: number;
  accountId: string;
  toAccountId?: string;
  category: string;
  subcategory?: string;
  name?: string;
  note?: string;
}

export interface Recurring {
  id: string;
  name: string;
  type: "expense" | "income";
  amount: number;
  accountId: string;
  category: string;
  dueDate: string;
  cadence: string;
  status: "pending" | "confirmed" | "skipped";
}

export type HabitKind = "bool" | "count";

export interface HabitSchedule {
  type: "daily" | "weekdays" | "timesPerWeek";
  days?: number[]; // 0..6
  times?: number;
}

export interface Habit {
  id: string;
  name: string;
  kind: HabitKind;
  target?: number;
  unit?: string;
  accent: "finance" | "habit" | "metric";
  schedule: HabitSchedule;
}

export interface HabitLog {
  habitId: string;
  date: string;
  value: number;
}

export type MetricKind = "number" | "time" | "text";

export interface Metric {
  id: string;
  name: string;
  kind: MetricKind;
  unit?: string;
  targetMin?: number;
  targetMax?: number;
}

export interface MetricLog {
  metricId: string;
  date: string;
  value: number | string; // time stored as minutes from midnight
}

export interface ShoppingItem {
  id: string;
  name: string;
  qty: number;
  estPrice: number;
  dueDate?: string;
  place?: string;
  purchasedOn?: string;
  paidPrice?: number;
}

export type ListAccent = "finance" | "habit" | "metric" | "negative" | "positive";

export interface ShoppingList {
  id: string;
  name: string;
  accent?: ListAccent;
  items: ShoppingItem[];
}

export interface CategoryDef {
  name: string;
  subs: string[];
}

export interface Settings {
  expenseCategories: CategoryDef[];
  incomeCategories: CategoryDef[];
  heatmapWeeks: number;
  metricTrendDays: number;
  showConsistencyOnToday: boolean;
}

export type PeriodKey = "today" | "week" | "month" | "year" | "custom";
