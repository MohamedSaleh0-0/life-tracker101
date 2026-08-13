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

  const listAccents = ["finance", "habit", "metric", "positive", "negative"] as const;
  const pendingAll = lists.flatMap((l) => l.items.filter((i) => !i.purchasedOn));
  const pendingTotal = pendingAll.reduce((s, i) => s + i.estPrice * i.qty, 0);

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

      {store.settings.showConsistencyOnToday && (
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
      )}

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
          title="Shopping lists"
          hint={`${lists.length} lists · ${pendingAll.length} pending · est. ${currency2(pendingTotal)}`}
          action={
            <Link to="/lists" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              All lists <ArrowUpRight className="size-3.5" />
            </Link>
          }
          bodyClassName="space-y-3"
        >
          {lists.map((list, index) => {
            const color = `var(--${list.accent ?? listAccents[index % listAccents.length]})`;
            const items = list.items.filter((i) => !i.purchasedOn);
            const est = items.reduce((sum, i) => sum + i.estPrice * i.qty, 0);
            return (
              <div
                key={list.id}
                className="rounded-md border bg-surface px-3 py-2"
                style={{ borderColor: `color-mix(in oklab, ${color} 40%, var(--border))` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="size-2 rounded-full" style={{ background: color }} />
                    {list.name}
                  </span>
                  <span className="num text-[11px] text-muted-foreground">
                    {items.length} · {currency2(est)}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {items.slice(0, 4).map((it) => (
                    <button
                      key={it.id}
                      onClick={() => store.toggleItemPurchased(list.id, it.id)}
                      className="flex w-full items-center justify-between gap-2 text-left text-xs text-foreground/90 hover:text-foreground"
                    >
                      <span className="truncate">
                        {it.qty > 1 && <span className="num mr-1 text-muted-foreground">{it.qty}×</span>}
                        {it.name}
                        {it.place && <span className="text-muted-foreground"> · {it.place}</span>}
                      </span>
                      <span className="num text-muted-foreground">
                        {currency2(it.estPrice * it.qty)}
                      </span>
                    </button>
                  ))}
                  {items.length > 4 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{items.length - 4} more
                    </span>
                  )}
                  {!items.length && (
                    <span className="text-[11px] text-muted-foreground">Nothing pending.</span>
                  )}
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
