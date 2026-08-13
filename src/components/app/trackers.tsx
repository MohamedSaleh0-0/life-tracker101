import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ring, accentVar } from "./ui-bits";
import { useStore, todayISO } from "@/data/store";
import {
  consistencyGrid,
  formatMetricValue,
  isComplete,
  logFor,
  metricLogFor,
  metricStats,
  streak,
} from "@/data/selectors";
import type { Habit, Metric } from "@/data/types";

export function HabitRow({ habit, date = todayISO() }: { habit: Habit; date?: string }) {
  const { habitLogs, logHabit, openModal } = useStore();
  const log = logFor(habitLogs, habit.id, date);
  const done = isComplete(habit, log);
  const ratio =
    habit.kind === "bool" ? (done ? 1 : 0) : Math.min(1, (log?.value ?? 0) / (habit.target ?? 1));
  const { current } = streak(habit, habitLogs);
  const color = accentVar(habit.accent);

  const scheduleLabel =
    habit.schedule.type === "daily"
      ? "Daily"
      : habit.schedule.type === "timesPerWeek"
        ? `${habit.schedule.times}× / week`
        : (habit.schedule.days ?? [])
            .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
            .join(" · ");

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
        done ? "border-transparent" : "border-border bg-surface hover:bg-surface-2/60",
      )}
      style={done ? { background: `color-mix(in oklab, ${color} 12%, var(--surface))` } : undefined}
    >
      <button
        onClick={() =>
          habit.kind === "bool"
            ? logHabit(habit.id, date, done ? 0 : 1)
            : openModal({ kind: "logHabit", habitId: habit.id })
        }
        className="shrink-0"
        aria-label={`Log ${habit.name}`}
      >
        {habit.kind === "bool" ? (
          <span
            className="grid size-7 place-items-center rounded-full border-2 transition-colors"
            style={{ borderColor: done ? color : "var(--border)", background: done ? color : "transparent" }}
          >
            {done && <Check className="size-4 text-background" strokeWidth={3} />}
          </span>
        ) : (
          <Ring ratio={ratio} color={color} size={30}>
            <span className="num">{log?.value ?? 0}</span>
          </Ring>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm font-medium", done && "text-foreground")}>
            {habit.name}
          </span>
          {current > 0 && (
            <span className="num rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {current}d streak
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {habit.kind === "count"
            ? `${log?.value ?? 0} / ${habit.target} ${habit.unit}`
            : scheduleLabel}
        </span>
      </div>

      <button
        onClick={() => openModal({ kind: "logHabit", habitId: habit.id })}
        className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label="Edit log"
      >
        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
}

export function MetricSlot({ metric }: { metric: Metric }) {
  const { metricLogs, openModal } = useStore();
  const date = todayISO();
  const log = metricLogFor(metricLogs, metric.id, date);
  const stats = metric.kind === "text" ? null : metricStats(metric, metricLogs);

  return (
    <button
      onClick={() => openModal({ kind: "logMetric", metricId: metric.id })}
      className={cn(
        "group flex w-full flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors",
        log ? "border-transparent bg-metric/10" : "border-border bg-surface hover:bg-surface-2/60",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="label-xs">{metric.name}</span>
        {log ? (
          <span className="flex items-center gap-1 text-[10px] text-metric">
            logged <Pencil className="size-3" />
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">tap to log</span>
        )}
      </div>
      <span className={cn("num text-xl font-semibold", !log && "text-muted-foreground/50")}>
        {log ? formatMetricValue(metric, log.value) : "—"}
      </span>
      {stats && (
        <span className="text-[11px] text-muted-foreground">
          7d avg {formatMetricValue(metric, stats.avg)}
        </span>
      )}
    </button>
  );
}

export function ConsistencyGrid({ habit, weeks = 12 }: { habit: Habit; weeks?: number }) {
  const { habitLogs } = useStore();
  const cells = consistencyGrid(habit, habitLogs, weeks);
  const color = accentVar(habit.accent);
  const columns: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  const [hover, setHover] = useState<{ iso: string; state: string; x: number; y: number } | null>(
    null,
  );

  const hoverLog = hover ? logFor(habitLogs, habit.id, hover.iso) : undefined;
  const hoverText = !hover
    ? ""
    : hover.state === "future"
      ? "upcoming"
      : hover.state === "off"
        ? "not scheduled"
        : habit.kind === "bool"
          ? hoverLog && hoverLog.value >= 1
            ? "Done"
            : "Missed"
          : `${hoverLog?.value ?? 0} / ${habit.target ?? 0} ${habit.unit ?? ""}`.trim();

  return (
    <div className="relative">
      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1.5 text-xs shadow-lg"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <div className="font-medium">{format(parseISO(hover.iso), "EEE d MMM yyyy")}</div>
          <div className="num text-muted-foreground">{hoverText}</div>
        </div>
      )}
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((c, ri) => (
            <span
              key={c.iso}
              onMouseEnter={() =>
                setHover({ iso: c.iso, state: c.state, x: ci * 14 + 5, y: ri * 14 })
              }
              onMouseLeave={() => setHover(null)}
              className="size-[11px] rounded-[2px]"
              style={{
                background:
                  c.state === "off" || c.state === "future"
                    ? "color-mix(in oklab, var(--border) 45%, transparent)"
                    : c.ratio > 0
                      ? `color-mix(in oklab, ${color} ${Math.round(20 + c.ratio * 80)}%, var(--surface-2))`
                      : "var(--surface-2)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
    </div>
  );
}
