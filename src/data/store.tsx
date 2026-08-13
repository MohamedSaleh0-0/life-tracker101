import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import * as seed from "./seed";
import type {
  Account,
  CategoryDef,
  Settings,
  Habit,
  HabitLog,
  Metric,
  MetricLog,
  PeriodKey,
  Recurring,
  ShoppingItem,
  ShoppingList,
  ListAccent,
  Transaction,
} from "./types";

export type ModalState =
  | { kind: "none" }
  | { kind: "chooser" }
  | { kind: "transaction"; type: "expense" | "income" | "transfer"; txId?: string }
  | { kind: "logHabit"; habitId: string; pick?: boolean }
  | { kind: "logMetric"; metricId: string; pick?: boolean }
  | { kind: "newHabit" }
  | { kind: "newMetric" }
  | { kind: "editHabit"; habitId: string }
  | { kind: "editMetric"; metricId: string }
  | { kind: "listItem"; listId: string; itemId?: string };

interface Store {
  accounts: Account[];
  transactions: Transaction[];
  recurring: Recurring[];
  habits: Habit[];
  habitLogs: HabitLog[];
  metrics: Metric[];
  metricLogs: MetricLog[];
  lists: ShoppingList[];
  settings: Settings;
  period: PeriodKey;
  customRange: { from: string; to: string };
  setPeriod: (p: PeriodKey) => void;
  setCustomRange: (r: { from: string; to: string }) => void;
  modal: ModalState;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  setRecurringStatus: (id: string, status: Recurring["status"]) => void;
  logHabit: (habitId: string, date: string, value: number) => void;
  clearHabit: (habitId: string, date: string) => void;
  addHabit: (h: Omit<Habit, "id">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  logMetric: (metricId: string, date: string, value: number | string) => void;
  clearMetric: (metricId: string, date: string) => void;
  addMetric: (m: Omit<Metric, "id">) => void;
  updateMetric: (id: string, patch: Partial<Metric>) => void;
  deleteMetric: (id: string) => void;
  toggleItemPurchased: (listId: string, itemId: string, price?: number) => void;
  addListItem: (listId: string, item: Omit<ShoppingItem, "id">) => void;
  updateListItem: (listId: string, itemId: string, patch: Partial<ShoppingItem>) => void;
  deleteListItem: (listId: string, itemId: string) => void;
  addList: (name: string) => void;
  updateList: (listId: string, patch: Partial<Omit<ShoppingList, "items">>) => void;
  deleteList: (listId: string) => void;
  deleteTransaction: (id: string) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addCategory: (type: "expense" | "income", name: string) => void;
  removeCategory: (type: "expense" | "income", name: string) => void;
  addSubcategory: (type: "expense" | "income", cat: string, sub: string) => void;
  removeSubcategory: (type: "expense" | "income", cat: string, sub: string) => void;
}

export const defaultSettings: Settings = {
  expenseCategories: [
    { name: "Groceries", subs: ["Fresh", "Pantry", "Household"] },
    { name: "Dining", subs: ["Junk", "Coffee", "Restaurant"] },
    { name: "Transport", subs: ["Fuel", "Transit", "Rideshare"] },
    { name: "Housing", subs: ["Rent", "Utilities", "Repairs"] },
    { name: "Health", subs: ["Pharmacy", "Gym", "Doctor"] },
    { name: "Subscriptions", subs: ["Streaming", "Software"] },
    { name: "Shopping", subs: ["Clothes", "Tech", "Home"] },
    { name: "Entertainment", subs: ["Events", "Games"] },
  ],
  incomeCategories: [
    { name: "Salary", subs: [] },
    { name: "Freelance", subs: ["Design", "Consulting"] },
    { name: "Interest", subs: [] },
    { name: "Gift", subs: [] },
    { name: "Refund", subs: [] },
  ],
  heatmapWeeks: 12,
  metricTrendDays: 60,
  showConsistencyOnToday: true,
};

const StoreContext = createContext<Store | null>(null);

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export function StoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(seed.accounts);
  const [transactions, setTransactions] = useState<Transaction[]>(seed.transactions);
  const [recurring, setRecurring] = useState<Recurring[]>(seed.recurring);
  const [habits, setHabits] = useState<Habit[]>(seed.habits);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(seed.habitLogs);
  const [metrics, setMetrics] = useState<Metric[]>(seed.metrics);
  const [metricLogs, setMetricLogs] = useState<MetricLog[]>(seed.metricLogs);
  const [lists, setLists] = useState<ShoppingList[]>(seed.shoppingLists);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customRange, setCustomRange] = useState({ from: todayISO(), to: todayISO() });
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const applyBalance = useCallback((tx: Transaction, sign: 1 | -1) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (tx.type === "transfer") {
          if (a.id === tx.accountId) return { ...a, balance: a.balance - sign * tx.amount };
          if (a.id === tx.toAccountId) return { ...a, balance: a.balance + sign * tx.amount };
          return a;
        }
        if (a.id !== tx.accountId) return a;
        const delta = tx.type === "income" ? tx.amount : -tx.amount;
        return { ...a, balance: a.balance + sign * delta };
      }),
    );
  }, []);

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">) => {
      const full: Transaction = { ...tx, id: uid("tx") };
      setTransactions((prev) => [full, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1)));
      applyBalance(full, 1);
    },
    [applyBalance],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      setTransactions((prev) => {
        const old = prev.find((t) => t.id === id);
        if (!old) return prev;
        const next = { ...old, ...patch };
        applyBalance(old, -1);
        applyBalance(next, 1);
        return prev.map((t) => (t.id === id ? next : t)).sort((a, b) => (a.date < b.date ? 1 : -1));
      });
    },
    [applyBalance],
  );

  const setRecurringStatus = useCallback(
    (id: string, status: Recurring["status"]) => {
      setRecurring((prev) => {
        const item = prev.find((r) => r.id === id);
        if (item && status === "confirmed" && item.status !== "confirmed") {
          addTransaction({
            date: item.dueDate,
            type: item.type,
            amount: item.amount,
            accountId: item.accountId,
            category: item.category,
            note: item.name,
          });
        }
        return prev.map((r) => (r.id === id ? { ...r, status } : r));
      });
    },
    [addTransaction],
  );

  const logHabit = useCallback((habitId: string, date: string, value: number) => {
    setHabitLogs((prev) => {
      const exists = prev.some((l) => l.habitId === habitId && l.date === date);
      if (exists)
        return prev.map((l) => (l.habitId === habitId && l.date === date ? { ...l, value } : l));
      return [...prev, { habitId, date, value }];
    });
  }, []);

  const clearHabit = useCallback((habitId: string, date: string) => {
    setHabitLogs((prev) => prev.filter((l) => !(l.habitId === habitId && l.date === date)));
  }, []);

  const addHabit = useCallback((h: Omit<Habit, "id">) => {
    setHabits((prev) => [...prev, { ...h, id: uid("h") }]);
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setHabitLogs((prev) => prev.filter((l) => l.habitId !== id));
  }, []);

  const logMetric = useCallback((metricId: string, date: string, value: number | string) => {
    setMetricLogs((prev) => {
      const exists = prev.some((l) => l.metricId === metricId && l.date === date);
      if (exists)
        return prev.map((l) => (l.metricId === metricId && l.date === date ? { ...l, value } : l));
      return [...prev, { metricId, date, value }];
    });
  }, []);

  const clearMetric = useCallback((metricId: string, date: string) => {
    setMetricLogs((prev) => prev.filter((l) => !(l.metricId === metricId && l.date === date)));
  }, []);

  const addMetric = useCallback((m: Omit<Metric, "id">) => {
    setMetrics((prev) => [...prev, { ...m, id: uid("m") }]);
  }, []);

  const updateMetric = useCallback((id: string, patch: Partial<Metric>) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteMetric = useCallback((id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    setMetricLogs((prev) => prev.filter((l) => l.metricId !== id));
  }, []);

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const old = prev.find((t) => t.id === id);
        if (old) applyBalance(old, -1);
        return prev.filter((t) => t.id !== id);
      });
    },
    [applyBalance],
  );

  const updateAccount = useCallback((id: string, patch: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const catKey = (type: "expense" | "income") =>
    type === "income" ? ("incomeCategories" as const) : ("expenseCategories" as const);

  const addCategory = useCallback((type: "expense" | "income", name: string) => {
    const key = catKey(type);
    setSettings((prev) =>
      prev[key].some((c) => c.name.toLowerCase() === name.toLowerCase())
        ? prev
        : { ...prev, [key]: [...prev[key], { name, subs: [] } as CategoryDef] },
    );
  }, []);

  const removeCategory = useCallback((type: "expense" | "income", name: string) => {
    const key = catKey(type);
    setSettings((prev) => ({ ...prev, [key]: prev[key].filter((c) => c.name !== name) }));
  }, []);

  const addSubcategory = useCallback((type: "expense" | "income", cat: string, sub: string) => {
    const key = catKey(type);
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].map((c) =>
        c.name !== cat || c.subs.includes(sub) ? c : { ...c, subs: [...c.subs, sub] },
      ),
    }));
  }, []);

  const removeSubcategory = useCallback((type: "expense" | "income", cat: string, sub: string) => {
    const key = catKey(type);
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].map((c) =>
        c.name !== cat ? c : { ...c, subs: c.subs.filter((s) => s !== sub) },
      ),
    }));
  }, []);

  const toggleItemPurchased = useCallback((listId: string, itemId: string, price?: number) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              items: l.items.map((it): ShoppingItem => {
                if (it.id !== itemId) return it;
                if (it.purchasedOn) {
                  const { purchasedOn: _p, paidPrice: _pp, ...rest } = it;
                  return rest;
                }
                return { ...it, purchasedOn: todayISO(), paidPrice: price ?? it.estPrice };
              }),

            },
      ),
    );
  }, []);

  const addListItem = useCallback((listId: string, item: Omit<ShoppingItem, "id">) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId ? l : { ...l, items: [...l.items, { ...item, id: uid("si") }] },
      ),
    );
  }, []);

  const updateListItem = useCallback(
    (listId: string, itemId: string, patch: Partial<ShoppingItem>) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id !== listId
            ? l
            : { ...l, items: l.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) },
        ),
      );
    },
    [],
  );

  const deleteListItem = useCallback((listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) => (l.id !== listId ? l : { ...l, items: l.items.filter((it) => it.id !== itemId) })),
    );
  }, []);

  const accents: ListAccent[] = ["finance", "habit", "metric", "positive", "negative"];

  const addList = useCallback((name: string) => {
    setLists((prev) => [
      ...prev,
      { id: uid("list"), name, accent: accents[prev.length % accents.length]!, items: [] },
    ]);
  }, []);

  const updateList = useCallback((listId: string, patch: Partial<Omit<ShoppingList, "items">>) => {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...patch } : l)));
  }, []);

  const deleteList = useCallback((listId: string) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
  }, []);

  const value = useMemo<Store>(
    () => ({
      accounts,
      transactions,
      recurring,
      habits,
      habitLogs,
      metrics,
      metricLogs,
      lists,
      period,
      customRange,
      setPeriod,
      setCustomRange,
      modal,
      openModal: setModal,
      closeModal: () => setModal({ kind: "none" }),
      addTransaction,
      updateTransaction,
      setRecurringStatus,
      logHabit,
      clearHabit,
      addHabit,
      updateHabit,
      deleteHabit,
      logMetric,
      clearMetric,
      addMetric,
      updateMetric,
      deleteMetric,
      toggleItemPurchased,
      addListItem,
      updateListItem,
      deleteListItem,
      addList,
      updateList,
      deleteList,
      deleteTransaction,
      updateAccount,
      settings,
      updateSettings,
      addCategory,
      removeCategory,
      addSubcategory,
      removeSubcategory,
    }),
    [
      accounts,
      transactions,
      recurring,
      habits,
      habitLogs,
      metrics,
      metricLogs,
      lists,
      period,
      customRange,
      modal,
      addTransaction,
      updateTransaction,
      setRecurringStatus,
      logHabit,
      clearHabit,
      addHabit,
      updateHabit,
      deleteHabit,
      logMetric,
      clearMetric,
      addMetric,
      toggleItemPurchased,
      addListItem,
      addList,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
