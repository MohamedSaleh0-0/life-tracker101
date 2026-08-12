import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/app/ui-bits";
import { useStore } from "@/data/store";
import { currency2 } from "@/data/selectors";

export const Route = createFileRoute("/lists")({
  head: () => ({
    meta: [
      { title: "Shopping lists — Life Tracker" },
      {
        name: "description",
        content: "Multiple shopping lists with estimated prices and a purchase history per list.",
      },
      { property: "og:title", content: "Shopping lists — Life Tracker" },
      { property: "og:description", content: "Pending items, estimates and what you actually paid." },
    ],
  }),
  component: ListsPage,
});

function ListsPage() {
  const { lists, toggleItemPurchased, addListItem, addList } = useStore();
  const [drafts, setDrafts] = useState<Record<string, { name: string; price: string }>>({});
  const [newList, setNewList] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="label-xs">Shopping</span>
          <h1 className="text-2xl font-semibold">Lists</h1>
        </div>
        <div className="flex gap-2">
          <Input
            value={newList}
            onChange={(e) => setNewList(e.target.value)}
            placeholder="New list name"
            className="w-44"
          />
          <Button
            variant="outline"
            disabled={!newList.trim()}
            onClick={() => {
              addList(newList.trim());
              setNewList("");
            }}
          >
            <Plus className="size-4" /> Add list
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {lists.map((list) => {
          const pending = list.items.filter((i) => !i.purchasedOn);
          const purchased = list.items.filter((i) => i.purchasedOn);
          const est = pending.reduce((s, i) => s + i.estPrice * i.qty, 0);
          const spent = purchased.reduce((s, i) => s + (i.paidPrice ?? 0) * i.qty, 0);
          const draft = drafts[list.id] ?? { name: "", price: "" };
          return (
            <Panel
              key={list.id}
              title={list.name}
              hint={`${pending.length} pending · est. ${currency2(est)} · ${currency2(spent)} purchased`}
              bodyClassName="space-y-3"
            >
              <div className="space-y-1.5">
                {pending.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
                  >
                    <button
                      onClick={() => toggleItemPurchased(list.id, it.id)}
                      className="grid size-5 place-items-center rounded border-2 border-border hover:border-finance"
                      aria-label={`Mark ${it.name} purchased`}
                    />
                    <span className="flex-1 truncate text-sm">
                      {it.qty > 1 && <span className="num mr-1 text-muted-foreground">{it.qty}×</span>}
                      {it.name}
                    </span>
                    <span className="num text-xs text-muted-foreground">
                      est. {currency2(it.estPrice * it.qty)}
                    </span>
                  </div>
                ))}
                {!pending.length && <p className="text-sm text-muted-foreground">List is clear.</p>}
              </div>

              <div className="flex gap-2">
                <Input
                  value={draft.name}
                  onChange={(e) => setDrafts({ ...drafts, [list.id]: { ...draft, name: e.target.value } })}
                  placeholder="Add item"
                />
                <Input
                  value={draft.price}
                  onChange={(e) =>
                    setDrafts({
                      ...drafts,
                      [list.id]: { ...draft, price: e.target.value.replace(/[^0-9.]/g, "") },
                    })
                  }
                  placeholder="Est. $"
                  className="w-24"
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!draft.name.trim()}
                  onClick={() => {
                    addListItem(list.id, draft.name.trim(), 1, Number(draft.price) || 0);
                    setDrafts({ ...drafts, [list.id]: { name: "", price: "" } });
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div>
                <span className="label-xs">Purchase history</span>
                <div className="mt-1.5 space-y-1">
                  {purchased.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 px-1 py-1 text-sm">
                      <Check className="size-3.5 text-positive" />
                      <span className="flex-1 truncate text-muted-foreground line-through">{it.name}</span>
                      <span className="num text-xs text-muted-foreground">
                        {currency2((it.paidPrice ?? 0) * it.qty)} ·{" "}
                        {format(parseISO(it.purchasedOn!), "d MMM")}
                      </span>
                      <button
                        onClick={() => toggleItemPurchased(list.id, it.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        undo
                      </button>
                    </div>
                  ))}
                  {!purchased.length && (
                    <p className="text-sm text-muted-foreground">Nothing purchased yet.</p>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
