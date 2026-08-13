import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/ui-bits";
import { MetricSlot } from "@/components/app/trackers";
import { useStore } from "@/data/store";
import { formatMetricValue, metricSeries, metricStats, minutesToTime } from "@/data/selectors";

export const Route = createFileRoute("/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics — Life Tracker" },
      {
        name: "description",
        content:
          "Daily metric trends: weight, sleep, wake-up time and notes with 7-day rolling averages.",
      },
      { property: "og:title", content: "Metrics — Life Tracker" },
      { property: "og:description", content: "Value trends over time for every daily metric." },
    ],
  }),
  component: MetricsPage,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
} as const;

function MetricsPage() {
  const { metrics, metricLogs, settings, openModal } = useStore();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="label-xs">Daily values</span>
          <h1 className="text-2xl font-semibold">Metrics</h1>
        </div>
        <Button size="sm" onClick={() => openModal({ kind: "newMetric" })}>
          <Plus className="size-4" /> New metric
        </Button>
      </div>

      <Panel title="Today" bodyClassName="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricSlot key={m.id} metric={m} />
        ))}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {metrics.map((m) => {
          if (m.kind === "text") {
            const entries = metricLogs
              .filter((l) => l.metricId === m.id)
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, 8);
            return (
              <Panel key={m.id} title={m.name} hint="Recent entries" bodyClassName="space-y-2">
                {entries.map((e) => (
                  <div key={e.date} className="rounded-md border border-border bg-surface px-3 py-2">
                    <span className="label-xs">{format(parseISO(e.date), "EEE d MMM")}</span>
                    <p className="text-sm text-foreground/90">{String(e.value)}</p>
                  </div>
                ))}
                {!entries.length && <p className="text-sm text-muted-foreground">No entries yet.</p>}
              </Panel>
            );
          }
          const series = metricSeries(m, metricLogs, settings.metricTrendDays);
          const stats = metricStats(m, metricLogs);
          const fmt = (v: number) => (m.kind === "time" ? minutesToTime(v) : String(v));
          return (
            <Panel
              key={m.id}
              title={m.name}
              hint={
                stats
                  ? `latest ${formatMetricValue(m, stats.latest)} · all-time average ${fmt(stats.avg)} · range ${fmt(stats.min)}–${fmt(stats.max)}`
                  : "No data yet"
              }
              bodyClassName="space-y-2"
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={series}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  {m.targetMin !== undefined && m.targetMax !== undefined && (
                    <ReferenceArea
                      y1={m.targetMin}
                      y2={m.targetMax}
                      fill="var(--metric)"
                      fillOpacity={0.08}
                    />
                  )}
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={30} />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    width={46}
                    tickFormatter={(v: number) => fmt(Math.round(v))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(l: string) => l}
                    formatter={(v: number | string, key) => [
                      typeof v === "number" ? fmt(v) : v,
                      key === "avg" ? "7-day average" : m.name,
                    ]}
                  />
                  <Line dataKey="value" stroke="var(--metric)" strokeWidth={2} dot={false} connectNulls />
                  <Line
                    dataKey="avg"
                    stroke="var(--habit)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full bg-metric" /> Value logged that day
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full bg-habit" /> 7-day rolling average — the mean
                  of the last 7 logged days, smoothing daily noise
                </span>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
