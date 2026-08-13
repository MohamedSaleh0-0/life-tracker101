import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, todayISO } from "@/data/store";
import { currency2 } from "@/data/selectors";
import { cn } from "@/lib/utils";
import type { ListAccent, ShoppingList } from "@/data/types";

export const Route = createFileRoute("/lists")({
  head: () => ({
    meta: [
      { title: "Shopping lists — Life Tracker" },
      {
        name: "description",
        content:
          "Multiple colour-coded shopping lists with estimated prices, due dates, places and purchase history.",
      },
      { property: "og:title", content: "Shopping lists — Life Tracker" },
      { property: "og:description", content: "Pending items, estimates and what you actually paid." },
    ],
  }),
  component: ListsPage,
});

const palette: ListAccent[] = ["finance", "habit", "metric", "positive", "negative"];
export const listColor = (list: ShoppingList, index: number) =>
  `var(--${list.accent ?? palette[index % palette.length]})`;

function ListsPage() {
  const { lists, toggleItemPurchased, addList, deleteList, updateList, openModal } = useStore();
  const [newList, setNewList] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const iso = todayISO();

  return (
    <div className="space-y-5">
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

      <div className="grid gap-5 xl:grid-cols-2">
        {lists.map((list, index) => {
          const color = listColor(list, index);
          const pending = list.items.filter((i) => !i.purchasedOn);
          const purchased = list.items.filter((i) => i.purchasedOn);
          const est = pending.reduce((s, i) => s + i.estPrice * i.qty, 0);
          const spent = purchased.reduce((s, i) => s + (i.paidPrice ?? 0) * i.qty, 0);

          return (
            <section
              key={list.id}
              className="overflow-hidden rounded-xl border bg-surface"
              style={{ borderColor: `color-mix(in oklab, ${color} 45%, var(--border))` }}
            >
              <header
                className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
                style={{
                  background: `color-mix(in oklab, ${color} 12%, var(--surface))`,
                  borderColor: `color-mix(in oklab, ${color} 35%, var(--border))`,
                }}
              >
                <span className="size-2.5 rounded-full" style={{ background: color }} />
                <div className="min-w-0 flex-1">
                  {renaming === list.id ? (
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-8 max-w-56"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (renameValue.trim()) updateList(list.id, { name: renameValue.trim() });
                          setRenaming(null);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-display truncate text-base font-semibold">{list.name}</h2>
                      <p className="text-[11px] text-muted-foreground">
                        {pending.length} pending · est. {currency2(est)} · {currency2(spent)} purchased
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="mr-1 flex gap-1">
                    {palette.map((a) => (
                      <button
                        key={a}
                        onClick={() => updateList(list.id, { accent: a })}
                        aria-label={`Colour ${a}`}
                        className={cn(
                          "size-3.5 rounded-full border",
                          (list.accent ?? palette[index % palette.length]) === a
                            ? "border-foreground"
                            : "border-transparent",
                        )}
                        style={{ background: `var(--${a})` }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenaming(list.id);
                      setRenameValue(list.name);
                    }}
                    aria-label="Rename list"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-negative"
                    onClick={() => deleteList(list.id)}
                    aria-label="Delete list"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </header>

              <div className="space-y-3 p-4">
                <div className="space-y-1.5">
                  {pending.map((it) => {
                    const overdue = it.dueDate ? it.dueDate < iso : false;
                    const days = it.dueDate
                      ? differenceInCalendarDays(parseISO(it.dueDate), parseISO(iso))
                      : null;
                    return (
                      <div
                        key={it.id}
                        className="group flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2"
                      >
                        <button
                          onClick={() => toggleItemPurchased(list.id, it.id)}
                          className="grid size-5 shrink-0 place-items-center rounded border-2 border-border"
                          style={{ borderColor: `color-mix(in oklab, ${color} 50%, var(--border))` }}
                          aria-label={`Mark ${it.name} purchased`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {it.qty > 1 && (
                              <span className="num mr-1 text-muted-foreground">{it.qty}×</span>
                            )}
                            {it.name}
                          </span>
                          {(it.place || it.dueDate) && (
                            <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              {it.place && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3" /> {it.place}
                                </span>
                              )}
                              {it.dueDate && (
                                <span className={overdue ? "text-negative" : undefined}>
                                  {overdue ? "overdue · " : days === 0 ? "today · " : "by "}
                                  {format(parseISO(it.dueDate), "d MMM")}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <span className="num text-xs text-muted-foreground">
                          est. {currency2(it.estPrice * it.qty)}
                        </span>
                        <button
                          onClick={() => openModal({ kind: "listItem", listId: list.id, itemId: it.id })}
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Edit ${it.name}`}
                        >
                          <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    );
                  })}
                  {!pending.length && <p className="text-sm text-muted-foreground">List is clear.</p>}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openModal({ kind: "listItem", listId: list.id })}
                >
                  <Plus className="size-4" /> Add item
                </Button>

                <div>
                  <span className="label-xs">Purchase history</span>
                  <div className="mt-1.5 space-y-1">
                    {purchased.map((it) => (
                      <div key={it.id} className="group flex items-center gap-3 px-1 py-1 text-sm">
                        <Check className="size-3.5 text-positive" />
                        <span className="flex-1 truncate text-muted-foreground line-through">
                          {it.name}
                        </span>
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
                        <button
                          onClick={() => openModal({ kind: "listItem", listId: list.id, itemId: it.id })}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Edit ${it.name}`}
                        >
                          <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                    {!purchased.length && (
                      <p className="text-sm text-muted-foreground">Nothing purchased yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
