import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, ListChecks, LineChart, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { todayISO, useStore } from "@/data/store";
import { logFor, metricLogFor, minutesToTime, timeToMinutes } from "@/data/selectors";
import type { HabitKind, MetricKind } from "@/data/types";

const expenseCategories = [
  "Groceries",
  "Dining",
  "Transport",
  "Housing",
  "Health",
  "Subscriptions",
  "Shopping",
  "Entertainment",
];
const incomeCategories = ["Salary", "Freelance", "Interest", "Gift", "Refund"];

function Chooser() {
  const { openModal, habits, metrics } = useStore();
  const options = [
    {
      label: "Expense",
      desc: "Money out",
      icon: TrendingDown,
      color: "var(--negative)",
      onClick: () => openModal({ kind: "transaction", type: "expense" }),
    },
    {
      label: "Income",
      desc: "Money in",
      icon: TrendingUp,
      color: "var(--positive)",
      onClick: () => openModal({ kind: "transaction", type: "income" }),
    },
    {
      label: "Transfer",
      desc: "Between accounts",
      icon: ArrowLeftRight,
      color: "var(--finance)",
      onClick: () => openModal({ kind: "transaction", type: "transfer" }),
    },
    {
      label: "Habit",
      desc: "Check off today",
      icon: ListChecks,
      color: "var(--habit)",
      onClick: () => openModal({ kind: "logHabit", habitId: habits[0]?.id ?? "" }),
    },
    {
      label: "Metric",
      desc: "Log a value",
      icon: LineChart,
      color: "var(--metric)",
      onClick: () => openModal({ kind: "logMetric", metricId: metrics[0]?.id ?? "" }),
    },
  ];
  return (
    <>
      <DialogHeader>
        <DialogTitle>What are you logging?</DialogTitle>
        <DialogDescription>Everything lands in the same day view.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={o.onClick}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
          >
            <span
              className="grid size-9 place-items-center rounded-md"
              style={{ background: `color-mix(in oklab, ${o.color} 16%, transparent)`, color: o.color }}
            >
              <o.icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function TransactionModal({
  type,
  txId,
}: {
  type: "expense" | "income" | "transfer";
  txId?: string;
}) {
  const { accounts, transactions, addTransaction, updateTransaction, closeModal } = useStore();
  const existing = txId ? transactions.find((t) => t.id === txId) : undefined;
  const [kind, setKind] = useState(type);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? accounts[1]?.id ?? "");
  const [category, setCategory] = useState(existing?.category ?? "Groceries");
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [note, setNote] = useState(existing?.note ?? "");

  const cats = kind === "income" ? incomeCategories : expenseCategories;
  const valid = Number(amount) > 0 && accountId && (kind !== "transfer" || toAccountId !== accountId);

  const submit = () => {
    const payload = {
      date,
      type: kind,
      amount: Math.round(Number(amount) * 100) / 100,
      accountId,
      category: kind === "transfer" ? "Transfer" : category,
      ...(kind === "transfer" ? { toAccountId } : {}),
      ...(note ? { note } : {}),
    };
    if (existing) updateTransaction(existing.id, payload);
    else addTransaction(payload);
    closeModal();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existing ? "Edit transaction" : "Log a transaction"}</DialogTitle>
        <DialogDescription>Balances update immediately across the app.</DialogDescription>
      </DialogHeader>

      <div className="flex rounded-md border border-border bg-surface p-0.5">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              kind === k ? "bg-surface-2 text-foreground" : "text-muted-foreground",
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="rounded-md border border-border bg-surface px-4 py-3">
          <span className="label-xs">Amount</span>
          <div className="flex items-baseline gap-1">
            <span className="num text-2xl text-muted-foreground">$</span>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className="num w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="label-xs">{kind === "transfer" ? "From account" : "Account"}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === "transfer" ? (
            <div className="space-y-1.5">
              <Label className="label-xs">To account</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="label-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="label-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="label-xs">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={closeModal}>
          Cancel
        </Button>
        <Button disabled={!valid} onClick={submit}>
          {existing ? "Save changes" : "Log it"}
        </Button>
      </DialogFooter>
    </>
  );
}

function LogHabitModal({ habitId }: { habitId: string }) {
  const { habits, habitLogs, logHabit, clearHabit, closeModal, openModal } = useStore();
  const [id, setId] = useState(habitId);
  const habit = habits.find((h) => h.id === id) ?? habits[0];
  const [date, setDate] = useState(todayISO());
  const existing = habit ? logFor(habitLogs, habit.id, date) : undefined;
  const [value, setValue] = useState<number>(existing?.value ?? (habit?.kind === "bool" ? 1 : 0));

  useEffect(() => {
    setValue(existing?.value ?? (habit?.kind === "bool" ? 1 : 0));
  }, [existing?.value, habit?.kind, id, date]);

  if (!habit) return null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log habit</DialogTitle>
        <DialogDescription>
          {existing ? "Already logged — edit the value below." : "Mark today's progress."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="label-xs">Habit</Label>
          <Select value={id} onValueChange={setId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {habits.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {habit.kind === "bool" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setValue(1)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md border p-4 text-sm font-medium",
                value >= 1 ? "border-habit bg-habit/15 text-habit" : "border-border bg-surface",
              )}
            >
              <Check className="size-4" /> Done
            </button>
            <button
              onClick={() => setValue(0)}
              className={cn(
                "rounded-md border p-4 text-sm font-medium",
                value < 1 ? "border-border bg-surface-2" : "border-border bg-surface",
              )}
            >
              Not today
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="label-xs">
                {habit.unit} · target {habit.target}
              </span>
              <span className="num text-sm text-muted-foreground">
                {Math.round((value / (habit.target ?? 1)) * 100)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setValue(Math.max(0, value - (habit.target ?? 1) / 8))}
              >
                <Minus className="size-4" />
              </Button>
              <input
                value={value}
                onChange={(e) => setValue(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                className="num min-w-0 flex-1 bg-transparent text-center text-3xl font-semibold outline-none"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setValue(value + (habit.target ?? 1) / 8)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="label-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => openModal({ kind: "newHabit" })}>
          New habit
        </Button>
        <div className="flex gap-2">
          {existing && (
            <Button
              variant="outline"
              onClick={() => {
                clearHabit(habit.id, date);
                closeModal();
              }}
            >
              Clear
            </Button>
          )}
          <Button
            onClick={() => {
              logHabit(habit.id, date, value);
              closeModal();
            }}
          >
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function LogMetricModal({ metricId }: { metricId: string }) {
  const { metrics, metricLogs, logMetric, clearMetric, closeModal, openModal } = useStore();
  const [id, setId] = useState(metricId);
  const metric = metrics.find((m) => m.id === id) ?? metrics[0];
  const [date, setDate] = useState(todayISO());
  const existing = metric ? metricLogFor(metricLogs, metric.id, date) : undefined;
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (!metric) return;
    if (existing) {
      setValue(
        metric.kind === "time" ? minutesToTime(Number(existing.value)) : String(existing.value),
      );
    } else {
      setValue(metric.kind === "time" ? "07:00" : "");
    }
  }, [existing, metric, id, date]);

  if (!metric) return null;

  const save = () => {
    const v =
      metric.kind === "time"
        ? timeToMinutes(value)
        : metric.kind === "number"
          ? Number(value)
          : value;
    logMetric(metric.id, date, v);
    closeModal();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log metric</DialogTitle>
        <DialogDescription>
          {existing ? "Already logged today — edit below." : "One value per day."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="label-xs">Metric</Label>
          <Select value={id} onValueChange={setId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="label-xs">Value</Label>
          {metric.kind === "text" ? (
            <Textarea
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="How did the day go?"
            />
          ) : metric.kind === "time" ? (
            <Input type="time" value={value} onChange={(e) => setValue(e.target.value)} />
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
              <input
                autoFocus
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                className="num w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/40"
              />
              <span className="text-sm text-muted-foreground">{metric.unit}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="label-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => openModal({ kind: "newMetric" })}>
          New metric
        </Button>
        <div className="flex gap-2">
          {existing && (
            <Button
              variant="outline"
              onClick={() => {
                clearMetric(metric.id, date);
                closeModal();
              }}
            >
              Clear
            </Button>
          )}
          <Button disabled={value === ""} onClick={save}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn("h-1 w-8 rounded-full", i <= step ? "bg-primary" : "bg-border")}
        />
      ))}
    </div>
  );
}

function NewHabitModal() {
  const { addHabit, closeModal } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [accent, setAccent] = useState<"finance" | "habit" | "metric">("habit");
  const [kind, setKind] = useState<HabitKind>("bool");
  const [target, setTarget] = useState("8");
  const [unit, setUnit] = useState("glasses");
  const [schedType, setSchedType] = useState<"daily" | "weekdays" | "timesPerWeek">("daily");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [times, setTimes] = useState("4");

  const finish = () => {
    addHabit({
      name: name.trim(),
      kind,
      accent,
      ...(kind === "count" ? { target: Number(target) || 1, unit } : {}),
      schedule:
        schedType === "weekdays"
          ? { type: "weekdays", days }
          : schedType === "timesPerWeek"
            ? { type: "timesPerWeek", times: Number(times) || 1 }
            : { type: "daily" },
    });
    closeModal();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New habit</DialogTitle>
        <DialogDescription>Three quick choices.</DialogDescription>
      </DialogHeader>
      <StepDots step={step} total={3} />

      {step === 0 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="label-xs">Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stretch before bed"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-xs">Accent</Label>
            <div className="flex gap-2">
              {(["habit", "metric", "finance"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAccent(a)}
                  className={cn(
                    "size-8 rounded-full border-2",
                    accent === a ? "border-foreground" : "border-transparent",
                  )}
                  style={{ background: `var(--${a})` }}
                  aria-label={a}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setKind("bool")}
              className={cn(
                "rounded-md border p-3 text-left text-sm",
                kind === "bool" ? "border-habit bg-habit/10" : "border-border bg-surface",
              )}
            >
              <span className="block font-medium">Yes / no</span>
              <span className="text-xs text-muted-foreground">Simple check-off</span>
            </button>
            <button
              onClick={() => setKind("count")}
              className={cn(
                "rounded-md border p-3 text-left text-sm",
                kind === "count" ? "border-habit bg-habit/10" : "border-border bg-surface",
              )}
            >
              <span className="block font-medium">Number vs target</span>
              <span className="text-xs text-muted-foreground">e.g. 8 glasses</span>
            </button>
          </div>
          {kind === "count" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-xs">Target</Label>
                <Input value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="label-xs">Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="grid gap-2">
            {(
              [
                ["daily", "Every day"],
                ["weekdays", "Specific weekdays"],
                ["timesPerWeek", "N times per week"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSchedType(k)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm",
                  schedType === k ? "border-habit bg-habit/10" : "border-border bg-surface",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {schedType === "weekdays" && (
            <div className="flex gap-1.5">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setDays((prev) =>
                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                    )
                  }
                  className={cn(
                    "size-9 rounded-md border text-xs",
                    days.includes(i) ? "border-habit bg-habit/15 text-habit" : "border-border",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          {schedType === "timesPerWeek" && (
            <div className="space-y-1.5">
              <Label className="label-xs">Times per week</Label>
              <Input value={times} onChange={(e) => setTimes(e.target.value)} />
            </div>
          )}
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? closeModal() : setStep(step - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 2 ? (
          <Button disabled={step === 0 && !name.trim()} onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button onClick={finish}>Create habit</Button>
        )}
      </DialogFooter>
    </>
  );
}

function NewMetricModal() {
  const { addMetric, closeModal } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MetricKind>("number");
  const [unit, setUnit] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const finish = () => {
    addMetric({
      name: name.trim(),
      kind,
      ...(kind === "number" && unit ? { unit } : {}),
      ...(min ? { targetMin: Number(min) } : {}),
      ...(max ? { targetMax: Number(max) } : {}),
    });
    closeModal();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New metric</DialogTitle>
        <DialogDescription>Freeform daily values — no pass or fail.</DialogDescription>
      </DialogHeader>
      <StepDots step={step} total={2} />

      {step === 0 ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="label-xs">Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Resting heart rate"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["number", "Number", "weight, hours"],
                ["time", "Time of day", "wake-up time"],
                ["text", "Text", "a daily note"],
              ] as const
            ).map(([k, label, hint]) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md border p-3 text-left text-sm",
                  kind === k ? "border-metric bg-metric/10" : "border-border bg-surface",
                )}
              >
                <span className="block font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {kind === "number" && (
            <div className="space-y-1.5">
              <Label className="label-xs">Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, h, bpm" />
            </div>
          )}
          {kind !== "text" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-xs">Target min (optional)</Label>
                <Input value={min} onChange={(e) => setMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="label-xs">Target max (optional)</Label>
                <Input value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
            </div>
          )}
          {kind === "text" && (
            <p className="text-sm text-muted-foreground">
              Text metrics show up as a timeline of daily entries.
            </p>
          )}
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={() => (step === 0 ? closeModal() : setStep(0))}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step === 0 ? (
          <Button disabled={!name.trim()} onClick={() => setStep(1)}>
            Continue
          </Button>
        ) : (
          <Button onClick={finish}>Create metric</Button>
        )}
      </DialogFooter>
    </>
  );
}

export function ModalHost() {
  const { modal, closeModal } = useStore();
  return (
    <Dialog open={modal.kind !== "none"} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="max-w-lg gap-4">
        {modal.kind === "chooser" && <Chooser />}
        {modal.kind === "transaction" && (
          <TransactionModal type={modal.type} {...(modal.txId ? { txId: modal.txId } : {})} />
        )}
        {modal.kind === "logHabit" && <LogHabitModal habitId={modal.habitId} />}
        {modal.kind === "logMetric" && <LogMetricModal metricId={modal.metricId} />}
        {modal.kind === "newHabit" && <NewHabitModal />}
        {modal.kind === "newMetric" && <NewMetricModal />}
      </DialogContent>
    </Dialog>
  );
}
