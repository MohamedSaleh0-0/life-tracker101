import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import * as seed from "./seed";
import type {
  Account,
  Habit,
  HabitLog,
  Metric,
  MetricLog,
  PeriodKey,
  Recurring,
  ShoppingList,
  Transaction,
} from "./types";

export type ModalState =
  | { kind: "none" }
  | { kind: "chooser" }
  | { kind: "transaction"; type: "expense" | "income" | "transfer"; txId?: string }
  | { kind: "logHabit"; habitId: string }
  | { kind: "logMetric"; metricId: string }
  | { kind: "newHabit" }
  | { kind: "newMetric" };

interface Store {
  accounts: Account[];
  transactions: Transaction[];
  recurring: Recurring[];
  habits: Habit[];
  habitLogs: HabitLog[];
  metrics: Metric[];
  metricLogs: MetricLog[];
  lists: ShoppingList[];
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
  logMetric: (metricId: string, date: string, value: number | string) => void;
  clearMetric: (metricId: string, date: string) => void;
  addMetric: (m: Omit<Metric, "id">) => void;
  toggleItemPurchased: (listId: string, itemId: string, price?: number) => void;
  addListItem: (listId: string, name: string, qty: number, estPrice: number) => void;
  addList: (name: string) => void;
}

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

  const toggleItemPurchased = useCallback((listId: string, itemId: string, price?: number) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              items: l.items.map((it) =>
                it.id !== itemId
                  ? it
                  : it.purchasedOn
                    ? { ...it, purchasedOn: undefined, paidPrice: undefined }
                    : { ...it, purchasedOn: todayISO(), paidPrice: price ?? it.estPrice },
              ),
            },
      ),
    );
  }, []);

  const addListItem = useCallback(
    (listId: string, name: string, qty: number, estPrice: number) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id !== listId ? l : { ...l, items: [...l.items, { id: uid("si"), name, qty, estPrice }] },
        ),
      );
    },
    [],
  );

  const addList = useCallback((name: string) => {
    setLists((prev) => [...prev, { id: uid("list"), name, items: [] }]);
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
      logMetric,
      clearMetric,
      addMetric,
      toggleItemPurchased,
      addListItem,
      addList,
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
