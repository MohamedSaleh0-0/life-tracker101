import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panel } from "@/components/app/ui-bits";
import { useStore } from "@/data/store";
import { currency2, inRange, periodRange } from "@/data/selectors";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Life Tracker" },
      {
        name: "description",
        content: "Search and filter every expense, income and transfer, grouped by day.",
      },
      { property: "og:title", content: "Transactions — Life Tracker" },
      { property: "og:description", content: "Full searchable transaction history." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { transactions, accounts, period, customRange, openModal } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [account, setAccount] = useState("all");
  const [scoped, setScoped] = useState(false);
  const range = periodRange(period, customRange);

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (type !== "all" && t.type !== type) return false;
        if (account !== "all" && t.accountId !== account && t.toAccountId !== account) return false;
        if (scoped && !inRange(t.date, range)) return false;
        if (q) {
          const hay = `${t.name ?? ""} ${t.note ?? ""} ${t.category} ${t.subcategory ?? ""} ${t.amount}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [transactions, type, account, scoped, q, range],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered.slice(0, 300)) {
      map.set(t.date, [...(map.get(t.date) ?? []), t]);
    }
    return [...map.entries()];
  }, [filtered]);

  const accName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div>
        <span className="label-xs">History</span>
        <h1 className="text-2xl font-semibold">Transactions</h1>
      </div>

      <Panel bodyClassName="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search names, notes, categories, amounts"
            className="pl-8"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={account} onValueChange={setAccount}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={scoped ? "default" : "outline"} onClick={() => setScoped(!scoped)}>
          {range.label}
        </Button>
      </Panel>

      <Panel hint={`${filtered.length} matching transactions`} bodyClassName="space-y-4">
        {grouped.map(([date, rows]) => {
          const dayNet = rows.reduce(
            (s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0),
            0,
          );
          return (
            <div key={date}>
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="label-xs">{format(parseISO(date), "EEE d MMM yyyy")}</span>
                <span className={`num text-xs ${dayNet >= 0 ? "text-positive" : "text-muted-foreground"}`}>
                  {dayNet >= 0 ? "+" : "−"}
                  {currency2(Math.abs(dayNet))}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {rows.map((t) => (
                  <div key={t.id} className="group flex items-center gap-3 py-2">
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        background:
                          t.type === "income"
                            ? "var(--positive)"
                            : t.type === "transfer"
                              ? "var(--finance)"
                              : "var(--negative)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{t.name ?? t.note ?? t.category}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.category}
                        {t.subcategory ? ` / ${t.subcategory}` : ""} · {accName(t.accountId)}
                        {t.toAccountId ? ` → ${accName(t.toAccountId)}` : ""}
                      </div>
                    </div>
                    <span
                      className={`num text-sm ${
                        t.type === "income"
                          ? "text-positive"
                          : t.type === "transfer"
                            ? "text-muted-foreground"
                            : ""
                      }`}
                    >
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                      {currency2(t.amount)}
                    </span>
                    <button
                      onClick={() =>
                        openModal({
                          kind: "transaction",
                          type: t.type,
                          txId: t.id,
                        })
                      }
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Edit transaction"
                    >
                      <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!grouped.length && <p className="text-sm text-muted-foreground">No transactions match.</p>}
      </Panel>
    </div>
  );
}
