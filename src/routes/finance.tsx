import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Panel, StatTile } from "@/components/app/ui-bits";
import { useStore } from "@/data/store";
import {
  byCategory,
  currency,
  currency2,
  flowSeries,
  netWorthSeries,
  periodRange,
  summarize,
  totalBalance,
} from "@/data/selectors";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Life Tracker" },
      {
        name: "description",
        content:
          "Balance, income, expenses and net for any period, plus net worth, category and account breakdowns.",
      },
      { property: "og:title", content: "Finance — Life Tracker" },
      {
        property: "og:description",
        content: "Income vs expenses, net worth over time and recurring bills that need review.",
      },
    ],
  }),
  component: FinancePage,
});

const chartColors = ["var(--finance)", "var(--habit)", "var(--metric)", "var(--positive)", "var(--negative)", "oklch(0.7 0.12 300)", "oklch(0.72 0.1 140)", "oklch(0.68 0.09 20)"];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
} as const;

function FinancePage() {
  const store = useStore();
  const { accounts, transactions, recurring, period, customRange } = store;
  const range = periodRange(period, customRange);
  const s = summarize(transactions, range);
  const flow = flowSeries(transactions, range);
  const nw = netWorthSeries(accounts, transactions, 180).filter((_, i) => i % 3 === 0);
  const expenseCats = byCategory(transactions, range, "expense");
  const incomeCats = byCategory(transactions, range, "income");
  const pending = recurring.filter((r) => r.status === "pending");
  const maxBalance = Math.max(...accounts.map((a) => Math.abs(a.balance)), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="label-xs">Finance</span>
          <h1 className="text-2xl font-semibold">{range.label}</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => store.openModal({ kind: "chooser" })}>
          Log transaction
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total balance" value={currency(totalBalance(accounts))} tone="finance" />
        <StatTile label="Income" value={currency(s.income)} tone="positive" sub={range.label} />
        <StatTile label="Expenses" value={currency(s.expenses)} tone="negative" sub={range.label} />
        <StatTile
          label="Net"
          value={currency(s.net)}
          tone={s.net >= 0 ? "positive" : "negative"}
          sub={s.income ? `${Math.round((s.net / s.income) * 100)}% of income kept` : ""}
        />
      </div>

      <Panel title="Recurring — needs review" hint={`${pending.length} pending`} bodyClassName="grid gap-2 md:grid-cols-2">
        {pending.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {r.cadence} · due {format(parseISO(r.dueDate), "d MMM")}
              </div>
            </div>
            <span className="num text-sm font-semibold">
              {r.type === "income" ? "+" : "−"}
              {currency2(r.amount)}
            </span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => store.setRecurringStatus(r.id, "skipped")}>
                Skip
              </Button>
              <Button size="sm" onClick={() => store.setRecurringStatus(r.id, "confirmed")}>
                Confirm
              </Button>
            </div>
          </div>
        ))}
        {!pending.length && <p className="text-sm text-muted-foreground">Nothing to review.</p>}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Income vs expenses" hint={range.label}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={flow}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={44} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" fill="var(--positive)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--negative)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Net worth" hint="Last 6 months">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={nw}>
              <defs>
                <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--finance)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--finance)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" minTickGap={40} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={54} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area dataKey="value" stroke="var(--finance)" strokeWidth={2} fill="url(#nwFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Expenses by category" hint={range.label}>
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={expenseCats} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} stroke="var(--surface)">
                  {expenseCats.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {expenseCats.slice(0, 7).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                  <span className="flex-1 truncate text-foreground/90">{c.name}</span>
                  <span className="num text-xs text-muted-foreground">{currency2(c.value)}</span>
                </div>
              ))}
              {!expenseCats.length && <p className="text-sm text-muted-foreground">No expenses in range.</p>}
            </div>
          </div>
        </Panel>

        <Panel title="Income by source" hint={range.label}>
          <div className="space-y-3 pt-2">
            {incomeCats.map((c, i) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="num text-muted-foreground">{currency2(c.value)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(c.value / (incomeCats[0]?.value ?? 1)) * 100}%`,
                      background: chartColors[i % chartColors.length],
                    }}
                  />
                </div>
              </div>
            ))}
            {!incomeCats.length && <p className="text-sm text-muted-foreground">No income in range.</p>}
          </div>
        </Panel>
      </div>

      <Panel title="Accounts" hint="Current balances">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="label-xs">{a.type}</span>
              </div>
              <div className={`num mt-1 text-xl font-semibold ${a.balance < 0 ? "text-negative" : ""}`}>
                {currency2(a.balance)}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-2">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${(Math.abs(a.balance) / maxBalance) * 100}%`,
                    background: a.balance < 0 ? "var(--negative)" : "var(--finance)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
