import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/app/ui-bits";
import { useStore } from "@/data/store";
import { cn } from "@/lib/utils";
import type { CategoryDef } from "@/data/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Life Tracker" },
      {
        name: "description",
        content:
          "Adjust categories and subcategories, accounts, habits, metrics and dashboard preferences.",
      },
      { property: "og:title", content: "Settings — Life Tracker" },
      { property: "og:description", content: "Tune categories, accounts, habits and metrics." },
    ],
  }),
  component: SettingsPage,
});

function CategoryEditor({ type }: { type: "expense" | "income" }) {
  const { settings, addCategory, removeCategory, addSubcategory, removeSubcategory } = useStore();
  const cats: CategoryDef[] =
    type === "income" ? settings.incomeCategories : settings.expenseCategories;
  const [newCat, setNewCat] = useState("");
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});

  return (
    <Panel
      title={type === "income" ? "Income categories" : "Expense categories"}
      hint="Subcategories show up in the logging dialog, e.g. Dining / Junk"
      bodyClassName="space-y-3"
    >
      {cats.map((c) => (
        <div key={c.name} className="rounded-md border border-border bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{c.name}</span>
            <button
              onClick={() => removeCategory(type, c.name)}
              className="text-muted-foreground hover:text-negative"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {c.subs.map((sub) => (
              <span
                key={sub}
                className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px]"
              >
                {sub}
                <button
                  onClick={() => removeSubcategory(type, c.name, sub)}
                  aria-label={`Remove ${sub}`}
                  className="text-muted-foreground hover:text-negative"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {!c.subs.length && (
              <span className="text-[11px] text-muted-foreground">No subcategories</span>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={subDrafts[c.name] ?? ""}
              onChange={(e) => setSubDrafts({ ...subDrafts, [c.name]: e.target.value })}
              placeholder="Add subcategory"
              className="h-8"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!(subDrafts[c.name] ?? "").trim()}
              onClick={() => {
                addSubcategory(type, c.name, (subDrafts[c.name] ?? "").trim());
                setSubDrafts({ ...subDrafts, [c.name]: "" });
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category"
        />
        <Button
          variant="outline"
          disabled={!newCat.trim()}
          onClick={() => {
            addCategory(type, newCat.trim());
            setNewCat("");
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </Panel>
  );
}

function SettingsPage() {
  const {
    accounts,
    updateAccount,
    habits,
    metrics,
    lists,
    deleteList,
    settings,
    updateSettings,
    openModal,
  } = useStore();

  return (
    <div className="space-y-4">
      <div>
        <span className="label-xs">Configuration</span>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CategoryEditor type="expense" />
        <CategoryEditor type="income" />

        <Panel title="Accounts" hint="Rename or correct a balance" bodyClassName="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Input
                value={a.name}
                onChange={(e) => updateAccount(a.id, { name: e.target.value })}
                className="flex-1"
              />
              <Input
                value={String(a.balance)}
                onChange={(e) =>
                  updateAccount(a.id, { balance: Number(e.target.value.replace(/[^0-9.-]/g, "")) || 0 })
                }
                className="num w-32"
              />
            </div>
          ))}
        </Panel>

        <Panel title="Display" hint="How much history the charts show" bodyClassName="space-y-3">
          <div className="space-y-1.5">
            <Label className="label-xs">Heatmap weeks ({settings.heatmapWeeks})</Label>
            <input
              type="range"
              min={4}
              max={26}
              value={settings.heatmapWeeks}
              onChange={(e) => updateSettings({ heatmapWeeks: Number(e.target.value) })}
              className="w-full accent-[var(--habit)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-xs">Metric trend window ({settings.metricTrendDays} days)</Label>
            <input
              type="range"
              min={14}
              max={180}
              step={7}
              value={settings.metricTrendDays}
              onChange={(e) => updateSettings({ metricTrendDays: Number(e.target.value) })}
              className="w-full accent-[var(--metric)]"
            />
          </div>
          <button
            onClick={() => updateSettings({ showConsistencyOnToday: !settings.showConsistencyOnToday })}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-sm",
              settings.showConsistencyOnToday
                ? "border-habit bg-habit/10"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            Consistency strip on Today {settings.showConsistencyOnToday ? "· on" : "· off"}
          </button>
        </Panel>

        <Panel title="Habits" hint="Edit or delete any habit" bodyClassName="space-y-1.5">
          {habits.map((h) => (
            <button
              key={h.id}
              onClick={() => openModal({ kind: "editHabit", habitId: h.id })}
              className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2/60"
            >
              <span>{h.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {h.kind === "count" ? `${h.target} ${h.unit}` : "yes / no"} · edit
              </span>
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => openModal({ kind: "newHabit" })}>
            <Plus className="size-4" /> New habit
          </Button>
        </Panel>

        <Panel title="Metrics" hint="Edit or delete any metric" bodyClassName="space-y-1.5">
          {metrics.map((m) => (
            <button
              key={m.id}
              onClick={() => openModal({ kind: "editMetric", metricId: m.id })}
              className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2/60"
            >
              <span>{m.name}</span>
              <span className="text-[11px] text-muted-foreground">{m.kind} · edit</span>
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => openModal({ kind: "newMetric" })}>
            <Plus className="size-4" /> New metric
          </Button>
        </Panel>

        <Panel title="Shopping lists" bodyClassName="space-y-1.5">
          {lists.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <span>{l.name}</span>
              <button
                onClick={() => deleteList(l.id)}
                className="text-muted-foreground hover:text-negative"
                aria-label={`Delete ${l.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
