import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/ui-bits";
import { ConsistencyGrid, HabitRow } from "@/components/app/trackers";
import { useStore } from "@/data/store";
import { accentVar } from "@/components/app/ui-bits";
import { habitValueSeries, streak, weeklyCompletion } from "@/data/selectors";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Habits — Life Tracker" },
      {
        name: "description",
        content:
          "Habit streaks, 12-week consistency grids and weekly completion trends for every habit you track.",
      },
      { property: "og:title", content: "Habits — Life Tracker" },
      { property: "og:description", content: "Streaks and consistency over time, not just today." },
    ],
  }),
  component: HabitsPage,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
} as const;

function HabitsPage() {
  const { habits, habitLogs, openModal } = useStore();
  const [openId, setOpenId] = useState<string | null>(habits[0]?.id ?? null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="label-xs">Consistency</span>
          <h1 className="text-2xl font-semibold">Habits</h1>
        </div>
        <Button size="sm" onClick={() => openModal({ kind: "newHabit" })}>
          <Plus className="size-4" /> New habit
        </Button>
      </div>

      <Panel title="Today" bodyClassName="grid gap-2 md:grid-cols-2">
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} />
        ))}
      </Panel>

      <div className="space-y-4">
        {habits.map((h) => {
          const s = streak(h, habitLogs);
          const weekly = weeklyCompletion(h, habitLogs, 12);
          const values = habitValueSeries(h, habitLogs, 30);
          const open = openId === h.id;
          const color = accentVar(h.accent);
          const avg = Math.round(weekly.reduce((a, b) => a + b.rate, 0) / (weekly.length || 1));
          return (
            <Panel
              key={h.id}
              title={h.name}
              hint={`${s.current}d current streak · ${s.longest}d longest · ${avg}% 12-week average`}
              action={
                <Button variant="ghost" size="sm" onClick={() => setOpenId(open ? null : h.id)}>
                  {open ? "Hide trends" : "Show trends"}
                </Button>
              }
              bodyClassName="space-y-4"
            >
              <ConsistencyGrid habit={h} />
              {open && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div>
                    <span className="label-xs">Weekly completion rate</span>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={weekly}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={20} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={34} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line dataKey="rate" stroke={color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <span className="label-xs">
                      {h.kind === "count" ? `Daily ${h.unit} vs target` : "Last 30 days"}
                    </span>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={values}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={24} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={34} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                        {h.kind === "count" && (
                          <ReferenceLine y={h.target} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                        )}
                        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
