"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";

import {
  regenerateShoppingListAction,
  removeExtraItemAction,
  removeShoppingItemAction,
  setExtraItemPurchasedAction,
  setShoppingItemPurchasedAction,
} from "@/lib/actions/lista-compra";
import { useToast } from "@/components/ui/toast";
import { dequeueChanges, enqueueChange } from "@/lib/offline-queue";
import {
  formatShoppingQuantity,
  groupShoppingList,
  type ShoppingListItem,
} from "@/lib/shopping-list";
import { useOnlineStatus } from "@/lib/use-online-status";

export function ShoppingListContent({
  items,
  pendingIds,
  onToggle,
  onRemove,
  accent = "stone",
}: {
  items: ShoppingListItem[];
  pendingIds: Set<string>;
  onToggle: (item: ShoppingListItem, purchased: boolean) => void;
  onRemove?: (item: ShoppingListItem) => void;
  accent?: "stone" | "emerald";
}) {
  const purchasedCount = items.filter((item) => item.comprado).length;
  const progress = items.length > 0 ? (purchasedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div className="no-print rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-bold text-stone-700">
            <span>
              {purchasedCount} de {items.length} comprados
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full transition-all ${
                accent === "emerald" ? "bg-emerald-600" : "bg-emerald-700"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {groupShoppingList(items).map(([category, categoryItems]) => {
        const sortedItems = [...categoryItems].sort(
          (left, right) => Number(left.comprado) - Number(right.comprado),
        );
        const categoryPurchased = categoryItems.filter(
          (item) => item.comprado,
        ).length;
        return (
        <section
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          key={category}
        >
          <h3
            className={`flex items-center justify-between px-5 py-3 text-sm font-black uppercase tracking-[0.16em] ${
              accent === "emerald"
                ? "bg-emerald-50 text-emerald-900"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            <span>{category}</span>
            <span className="text-xs font-bold normal-case tracking-normal text-stone-500">
              {categoryPurchased}/{categoryItems.length}
            </span>
          </h3>
          <ul className="divide-y divide-stone-100">
            {sortedItems.map((item, index) => {
              const checkboxId = `cart-${accent}-${category}-${index}-${item.id}`.replace(
                /[^a-zA-Z0-9_-]/g,
                "-",
              );
              return (
                <li className="flex items-center gap-4 px-5 py-4" key={item.id}>
                  <input
                    checked={item.comprado}
                    className="h-5 w-5 shrink-0 accent-emerald-700"
                    disabled={pendingIds.has(item.id)}
                    id={checkboxId}
                    onChange={(event) => onToggle(item, event.target.checked)}
                    type="checkbox"
                  />
                  <label
                    className={`flex min-w-0 flex-1 cursor-pointer items-baseline justify-between gap-4 ${
                      item.comprado
                        ? "text-stone-400 line-through"
                        : "text-stone-900"
                    }`}
                    htmlFor={checkboxId}
                  >
                    <span className="font-semibold">{item.nombre}</span>
                    <span className="shrink-0 text-sm font-bold">
                      {formatShoppingQuantity(item.cantidad)} {item.unidad}
                    </span>
                  </label>
                  {onRemove && (
                    <button
                      aria-label={`Retirar ${item.nombre}`}
                      className="no-print shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={pendingIds.has(item.id)}
                      onClick={() => onRemove(item)}
                      type="button"
                    >
                      Quitar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        );
      })}
    </div>
  );
}

export function ExtraShoppingList({
  initialItems,
}: {
  initialItems: ShoppingListItem[];
}) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [items, setItems] = useState(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const showToast = useToast();

  useEffect(() => setItems(initialItems), [initialItems]);

  const flushPending = useCallback(() => {
    const queue = dequeueChanges("extra");
    if (queue.length === 0) return;
    startTransition(async () => {
      for (const change of queue) {
        if (change.type === "toggle") {
          await setExtraItemPurchasedAction(change.itemId, change.purchased);
        } else {
          await removeExtraItemAction(change.itemId);
        }
      }
      showToast("Cambios sincronizados.");
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (online) flushPending();
  }, [online, flushPending]);

  function toggleItem(item: ShoppingListItem, purchased: boolean) {
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, comprado: purchased }
          : candidate,
      ),
    );

    if (!online) {
      enqueueChange({
        kind: "extra",
        type: "toggle",
        itemId: item.id,
        purchased,
      });
      showToast("Sin conexión: guardado en este dispositivo.");
      return;
    }

    setPendingIds((current) => new Set(current).add(item.id));
    startTransition(async () => {
      const result = await setExtraItemPurchasedAction(item.id, purchased);
      if (!result.ok) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? item : candidate,
          ),
        );
      }
      showToast(result.message, result.ok ? "ok" : "error");
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    });
  }

  function removeItem(item: ShoppingListItem) {

    if (!online) {
      setItems((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      enqueueChange({ kind: "extra", type: "remove", itemId: item.id });
      showToast("Sin conexión: quitado en este dispositivo.");
      return;
    }

    setPendingIds((current) => new Set(current).add(item.id));
    startTransition(async () => {
      const result = await removeExtraItemAction(item.id);
      if (result.ok) {
        setItems((current) =>
          current.filter((candidate) => candidate.id !== item.id),
        );
        router.refresh();
      }
      showToast(result.message, result.ok ? "ok" : "error");
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    });
  }

  return (
    <section className="mt-10">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Mi lista
        </p>
        <h2 className="mt-1 text-2xl font-black text-stone-950">
          Ingredientes añadidos a mano
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Recetas que añadiste directamente, sin pasar por el planificador. Se
          conservan hasta que las retires.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center text-sm text-stone-600">
          Aún no has añadido recetas a esta lista.
        </div>
      ) : (
        <ShoppingListContent
          accent="emerald"
          items={items}
          onRemove={removeItem}
          onToggle={toggleItem}
          pendingIds={pendingIds}
        />
      )}
    </section>
  );
}

export function CloudShoppingList({
  week,
  initialItems,
}: {
  week: string;
  initialItems: ShoppingListItem[];
}) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [items, setItems] = useState(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const showToast = useToast();

  useEffect(() => setItems(initialItems), [initialItems]);

  const flushPending = useCallback(() => {
    const queue = dequeueChanges("shopping");
    if (queue.length === 0) return;
    startTransition(async () => {
      for (const change of queue) {
        if (change.type === "toggle") {
          await setShoppingItemPurchasedAction(change.itemId, change.purchased);
        } else {
          await removeShoppingItemAction(change.itemId);
        }
      }
      showToast("Cambios sincronizados.");
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (online) flushPending();
  }, [online, flushPending]);

  function regenerate() {
    setRegenerating(true);
    showToast("Regenerando la lista...", "pending");
    startTransition(async () => {
      const result = await regenerateShoppingListAction(week);
      showToast(result.message, result.ok ? "ok" : "error");
      if (result.ok) router.refresh();
      setRegenerating(false);
    });
  }

  function toggleItem(item: ShoppingListItem, purchased: boolean) {
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, comprado: purchased }
          : candidate,
      ),
    );

    if (!online) {
      enqueueChange({
        kind: "shopping",
        type: "toggle",
        itemId: item.id,
        purchased,
      });
      showToast(
        "Sin conexión: guardado aquí. Se sincronizará al recuperar cobertura.",
      );
      return;
    }

    setPendingIds((current) => new Set(current).add(item.id));
    startTransition(async () => {
      const result = await setShoppingItemPurchasedAction(item.id, purchased);
      if (!result.ok) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? item : candidate,
          ),
        );
      }
      showToast(result.message, result.ok ? "ok" : "error");
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    });
  }

  function removeItem(item: ShoppingListItem) {

    if (!online) {
      setItems((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      enqueueChange({ kind: "shopping", type: "remove", itemId: item.id });
      showToast(
        "Sin conexión: quitado aquí. Se sincronizará al recuperar cobertura.",
      );
      return;
    }

    setPendingIds((current) => new Set(current).add(item.id));
    startTransition(async () => {
      const result = await removeShoppingItemAction(item.id);
      if (result.ok) {
        setItems((current) =>
          current.filter((candidate) => candidate.id !== item.id),
        );
        router.refresh();
      }
      showToast(result.message, result.ok ? "ok" : "error");
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    });
  }

  return (
    <div>
      <div className="no-print mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="font-bold text-stone-950">Lista derivada del menú</p>
          <p className="mt-1 text-sm text-stone-600">
            {online
              ? "Regenera después de cambiar una receta. Las unidades no se convierten."
              : "Sin conexión: no se puede regenerar hasta recuperar cobertura."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={regenerating || !online}
            onClick={regenerate}
            type="button"
          >
            {regenerating ? "Regenerando..." : "Regenerar lista"}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-10 text-center">
          <p className="font-bold text-stone-900">La lista está vacía</p>
          <p className="mt-2 text-sm text-stone-600">
            Añade recetas al menú o pulsa regenerar para obtener sus ingredientes.
          </p>
        </div>
      ) : (
          <ShoppingListContent
            items={items}
            onRemove={removeItem}
            onToggle={toggleItem}
          pendingIds={pendingIds}
        />
      )}
    </div>
  );
}
