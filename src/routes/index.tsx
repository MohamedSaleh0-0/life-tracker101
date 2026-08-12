import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, StatTile } from "@/components/app/ui-bits";
import { HabitRow, MetricSlot } from "@/components/app/trackers";
import { todayISO, useStore } from "@/data/store";
import {
  currency,
  currency2,
  isComplete,
  isScheduled,
  logFor,
  metricLogFor,
  overallConsistency,
  periodRange,
  summarize,
  totalBalance,
} from "@/data/selectors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Life Tracker" },
      {
        name: "description",
        content:
          "Your daily cockpit: habits to check off, metrics to log, today's spending and bills that need review.",
      },
      { property: "og:title", content: "Today — Life Tracker" },
      {
        property: "og:description",
        content: "Habits, metrics and money for today in a single dark dashboard.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const store = useStore();
  const {
    accounts,
    transactions,
    habits,
    habitLogs,
    metrics,
    metricLogs,
    recurring,
    lists,
    openModal,
  } = store;
  const iso = todayISO();
  const now = new Date();
  const dayRange = periodRange("today", store.customRange);
  const todaySummary = summarize(transactions, dayRange);
  const monthSummary = summarize(transactions, periodRange("month", store.customRange));

  const scheduled = habits.filter((h) => isScheduled(h, now));
  const doneCount = scheduled.filter((h) => isComplete(h, logFor(habitLogs, h.id, iso))).length;
  const metricsLogged = metrics.filter((m) => metricLogFor(metricLogs, m.id, iso)).length;
  const consistency = overallConsistency(habits, habitLogs, 30);

  const dueSoon = recurring
    .filter((r) => r.status === "pending")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 4);

  const activeList = lists[0];
  const pending = activeList?.items.filter((i) => !i.purchasedOn) ?? [];
  const pendingTotal = pending.reduce((s, i) => s + i.estPrice * i.qty, 0);

  const todayTx = transactions.filter((t) => t.date === iso);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="label-xs">{format(now, "EEEE")}</span>
          <h1 className="text-2xl font-semibold">{format(now, "d MMMM yyyy")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {doneCount}/{scheduled.length} habits · {metricsLogged}/{metrics.length} metrics ·{" "}
          {todayTx.length} transactions logged today
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total balance"
          value={currency(totalBalance(accounts))}
          sub={`${accounts.length} accounts`}
          tone="finance"
        />
        <StatTile
          label="Spent today"
          value={currency2(todaySummary.expenses)}
          sub={`${currency(monthSummary.expenses)} this month`}
          tone={todaySummary.expenses ? "negative" : "neutral"}
        />
        <StatTile
          label="Habit completion"
          value={`${scheduled.length ? Math.round((doneCount / scheduled.length) * 100) : 0}%`}
          sub={`${doneCount} of ${scheduled.length} scheduled today`}
        />
        <StatTile
          label="Net this month"
          value={currency(monthSummary.net)}
          sub={`${currency(monthSummary.income)} in · ${currency(monthSummary.expenses)} out`}
          tone={monthSummary.net >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Today's habits"
          hint="Checked items lock in with today's value"
          action={
            <Button variant="ghost" size="sm" onClick={() => openModal({ kind: "newHabit" })}>
              <Plus className="size-4" /> New
            </Button>
          }
          bodyClassName="space-y-2"
        >
          {scheduled.map((h) => (
            <HabitRow key={h.id} habit={h} />
          ))}
          {!scheduled.length && (
            <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
          )}
        </Panel>

        <Panel
          title="Today's metrics"
          hint="One value per day — tap a logged card to edit"
          action={
            <Button variant="ghost" size="sm" onClick={() => openModal({ kind: "newMetric" })}>
              <Plus className="size-4" /> New
            </Button>
          }
          bodyClassName="grid gap-2 sm:grid-cols-2"
        >
          {metrics.map((m) => (
            <MetricSlot key={m.id} metric={m} />
          ))}
        </Panel>
      </div>

      <Panel
        title="Consistency — last 30 days"
        hint="Share of scheduled habits completed each day"
        action={
          <Link to="/habits" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            All habits <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        <div className="flex items-end gap-[5px]">
          {consistency.map((d) => (
            <div key={d.iso} className="group relative flex-1">
              <div
                title={`${d.label}: ${d.done}/${d.total}`}
                className="w-full rounded-sm"
                style={{
                  height: `${12 + d.rate * 56}px`,
                  background:
                    d.rate >= 0.99
                      ? "var(--habit)"
                      : `color-mix(in oklab, var(--habit) ${Math.round(18 + d.rate * 70)}%, var(--surface-2))`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{consistency[0]?.label}</span>
          <span>today</span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Needs review"
          hint="Recurring items due"
          className="xl:col-span-2"
          bodyClassName="space-y-2"
        >
          {dueSoon.map((r) => {
            const overdue = r.dueDate < iso;
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: r.type === "income" ? "var(--positive)" : "var(--negative)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.cadence} ·{" "}
                    <span className={overdue ? "text-negative" : undefined}>
                      {overdue ? "overdue " : "due "}
                      {format(parseISO(r.dueDate), "d MMM")}
                    </span>
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
            );
          })}
          {!dueSoon.length && <p className="text-sm text-muted-foreground">All caught up.</p>}
        </Panel>

        <Panel
          title={activeList?.name ?? "Shopping"}
          hint={`${pending.length} pending · est. ${currency2(pendingTotal)}`}
          action={
            <Link to="/lists" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Lists <ArrowUpRight className="size-3.5" />
            </Link>
          }
          bodyClassName="space-y-1.5"
        >
          {pending.slice(0, 6).map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span className="truncate text-foreground/90">
                {it.qty > 1 && <span className="num mr-1 text-muted-foreground">{it.qty}×</span>}
                {it.name}
              </span>
              <span className="num text-xs text-muted-foreground">{currency2(it.estPrice * it.qty)}</span>
            </div>
          ))}
          {!pending.length && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
        </Panel>
      </div>
    </div>
  );
}
