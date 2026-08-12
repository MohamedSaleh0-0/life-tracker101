import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  CalendarRange,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Plus,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/data/store";
import { periodRange } from "@/data/selectors";
import type { PeriodKey } from "@/data/types";

const nav = [
  { to: "/", label: "Today", icon: LayoutDashboard },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/lists", label: "Lists", icon: ShoppingCart },
  { to: "/habits", label: "Habits", icon: ListChecks },
  { to: "/metrics", label: "Metrics", icon: LineChart },
] as const;

const periods: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function PeriodSelector() {
  const { period, setPeriod, customRange, setCustomRange } = useStore();
  const range = periodRange(period, customRange);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              period === p.key
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                period === "custom"
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarRange className="size-3.5" />
              Custom
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <div className="space-y-1">
              <span className="label-xs">From</span>
              <input
                type="date"
                value={customRange.from}
                onChange={(e) => {
                  setCustomRange({ ...customRange, from: e.target.value });
                  setPeriod("custom");
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="label-xs">To</span>
              <input
                type="date"
                value={customRange.to}
                onChange={(e) => {
                  setCustomRange({ ...customRange, to: e.target.value });
                  setPeriod("custom");
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <span className="hidden text-xs text-muted-foreground md:inline">{range.label}</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { openModal } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[13.5rem] flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="grid size-7 place-items-center rounded bg-finance/15 text-finance">
            <Activity className="size-4" />
          </span>
          <div className="leading-none">
            <div className="font-display text-sm font-semibold tracking-tight">Life Tracker</div>
            <div className="label-xs mt-1">money · habits · metrics</div>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-2">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
                )}
              >
                <n.icon className={cn("size-4", active && "text-finance")} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
          Sample data resets on reload.
        </div>
      </aside>

      <div className="md:pl-[13.5rem]">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
          <PeriodSelector />
          <Button size="sm" onClick={() => openModal({ kind: "chooser" })} className="gap-1.5">
            <Plus className="size-4" />
            Log
          </Button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs",
                  active ? "bg-surface-2 text-foreground" : "text-muted-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <main className="mx-auto max-w-[1500px] px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
