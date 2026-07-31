"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import {
  regenerateShoppingListAction,
  removeExtraItemAction,
  setExtraItemPurchasedAction,
  setShoppingItemPurchasedAction,
} from "@/lib/actions/lista-compra";
import {
  consolidateShoppingList,
  formatShoppingQuantity,
  groupShoppingList,
  type ShoppingListItem,
  type ShoppingRecipeIngredient,
} from "@/lib/shopping-list";

type LocalShoppingListProps = {
  week: string;
  slots: Record<string, string>;
  pool: string[];
  recipes: { id: string; ingredientes?: ShoppingRecipeIngredient[] }[];
};

type StoredPurchase = { cantidad: number; comprado: boolean };

function ShoppingItems({
  items,
  pendingIds,
  onToggle,
}: {
  items: ShoppingListItem[];
  pendingIds: Set<string>;
  onToggle: (item: ShoppingListItem, purchased: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      {groupShoppingList(items).map(([category, categoryItems]) => (
        <section
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          key={category}
        >
          <h3 className="bg-stone-100 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-stone-700">
            {category}
          </h3>
          <ul className="divide-y divide-stone-100">
            {categoryItems.map((item, index) => {
              const checkboxId = `shopping-${category}-${index}-${item.id}`.replace(
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
                      item.comprado ? "text-stone-400 line-through" : "text-stone-900"
                    }`}
                    htmlFor={checkboxId}
                  >
                    <span className="font-semibold">{item.nombre}</span>
                    <span className="shrink-0 text-sm font-bold">
                      {formatShoppingQuantity(item.cantidad)} {item.unidad}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function LocalShoppingList({
  week,
  slots,
  pool,
  recipes,
}: LocalShoppingListProps) {
  const extraKey = "saborsemanal:shopping:extra";
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const derivedItems = consolidateShoppingList(slots, recipes, [
    ...pool,
    ...extraIds,
  ]);
  const [purchases, setPurchases] = useState<Record<string, StoredPurchase>>({});
  const [message, setMessage] = useState<string | null>(null);
  const storageKey = `saborsemanal:shopping:${week}`;

  useEffect(() => {
    function loadExtra(value: string | null) {
      const validRecipeIds = new Set(recipes.map((recipe) => recipe.id));
      if (!value) {
        setExtraIds([]);
        return;
      }
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setExtraIds(
            [
              ...new Set(
                parsed.filter(
                  (id): id is string =>
                    typeof id === "string" && validRecipeIds.has(id),
                ),
              ),
            ].slice(0, 50),
          );
        }
      } catch {
        setExtraIds([]);
      }
    }

    loadExtra(localStorage.getItem(extraKey));
    function handleStorage(event: StorageEvent) {
      if (event.key === extraKey) loadExtra(event.newValue);
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [recipes]);

  useEffect(() => {
    const currentItems = consolidateShoppingList(slots, recipes, [
      ...pool,
      ...extraIds,
    ]);
    function reconcile(value: string | null) {
      let stored: Record<string, StoredPurchase> = {};
      if (value) {
        const parsed: unknown = JSON.parse(value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          stored = parsed as Record<string, StoredPurchase>;
        }
      }

      const reconciled = Object.fromEntries(
        currentItems.map((item) => [
          item.id,
          {
            cantidad: item.cantidad,
            comprado:
              stored[item.id]?.cantidad === item.cantidad &&
              stored[item.id]?.comprado === true,
          },
        ]),
      );
      setPurchases(reconciled);
      return reconciled;
    }

    try {
      const reconciled = reconcile(localStorage.getItem(storageKey));
      localStorage.setItem(storageKey, JSON.stringify(reconciled));
    } catch {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
      }
      setMessage("El navegador no pudo guardar la lista.");
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      try {
        reconcile(event.newValue);
      } catch {
        setPurchases({});
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [extraIds, pool, recipes, slots, storageKey]);

  const items = derivedItems.map((item) => ({
    ...item,
    comprado: purchases[item.id]?.comprado ?? false,
  }));

  function toggleItem(item: ShoppingListItem, purchased: boolean) {
    let latest = purchases;
    try {
      const value = localStorage.getItem(storageKey);
      const parsed: unknown = value ? JSON.parse(value) : null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        latest = parsed as Record<string, StoredPurchase>;
      }
    } catch {
      // Fall back to the in-memory state when storage cannot be read.
    }
    const next = {
      ...latest,
      [item.id]: { cantidad: item.cantidad, comprado: purchased },
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setPurchases(next);
      setMessage("Lista guardada en este dispositivo.");
    } catch {
      setMessage("El navegador no pudo guardar el cambio.");
    }
  }

  return (
    <section className="mt-10 border-t border-stone-300 pt-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
            Consolidación local
          </p>
          <h2 className="mt-1 text-3xl font-black text-stone-950">
            Lista de la compra
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Se actualiza con el menú y solo se guarda en este navegador.
          </p>
        </div>
        <button
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
          onClick={() => {
            setMessage("Lista actualizada desde el menú de esta semana.");
          }}
          type="button"
        >
          Regenerar lista
        </button>
      </div>

      {message && (
        <p className="mb-4 text-sm text-stone-600" role="status">
          {message}
        </p>
      )}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center text-stone-600">
          Añade recetas al planificador para generar la lista.
        </div>
      ) : (
        <ShoppingItems items={items} onToggle={toggleItem} pendingIds={new Set()} />
      )}
    </section>
  );
}

export function ExtraShoppingList({
  initialItems,
}: {
  initialItems: ShoppingListItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => setItems(initialItems), [initialItems]);

  function toggleItem(item: ShoppingListItem, purchased: boolean) {
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, comprado: purchased }
          : candidate,
      ),
    );
    setPendingIds((current) => new Set(current).add(item.id));
    setMessage(null);

    startTransition(async () => {
      const result = await setExtraItemPurchasedAction(item.id, purchased);
      if (!result.ok) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? item : candidate,
          ),
        );
      }
      setMessage({ ok: result.ok, text: result.message });
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    });
  }

  function removeItem(item: ShoppingListItem) {
    setPendingIds((current) => new Set(current).add(item.id));
    setMessage(null);

    startTransition(async () => {
      const result = await removeExtraItemAction(item.id);
      if (result.ok) {
        setItems((current) =>
          current.filter((candidate) => candidate.id !== item.id),
        );
        router.refresh();
      }
      setMessage({ ok: result.ok, text: result.message });
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

      {message && (
        <p
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role={message.ok ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center text-sm text-stone-600">
          Aún no has añadido recetas a esta lista.
        </div>
      ) : (
        <div className="space-y-5">
          {groupShoppingList(items).map(([category, categoryItems]) => (
            <section
              className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              key={category}
            >
              <h3 className="bg-emerald-50 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-emerald-900">
                {category}
              </h3>
              <ul className="divide-y divide-stone-100">
                {categoryItems.map((item, index) => {
                  const checkboxId = `extra-${category}-${index}-${item.id}`.replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-",
                  );
                  return (
                    <li
                      className="flex items-center gap-4 px-5 py-4"
                      key={item.id}
                    >
                      <input
                        checked={item.comprado}
                        className="h-5 w-5 shrink-0 accent-emerald-700"
                        disabled={pendingIds.has(item.id)}
                        id={checkboxId}
                        onChange={(event) =>
                          toggleItem(item, event.target.checked)
                        }
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
                      <button
                        aria-label={`Retirar ${item.nombre}`}
                        className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={pendingIds.has(item.id)}
                        onClick={() => removeItem(item)}
                        type="button"
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
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
  const [items, setItems] = useState(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => setItems(initialItems), [initialItems]);

  function regenerate() {
    setRegenerating(true);
    setMessage(null);
    startTransition(async () => {
      const result = await regenerateShoppingListAction(week);
      setMessage({ ok: result.ok, text: result.message });
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
    setPendingIds((current) => new Set(current).add(item.id));
    setMessage(null);

    startTransition(async () => {
      const result = await setShoppingItemPurchasedAction(item.id, purchased);
      if (!result.ok) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? item : candidate,
          ),
        );
      }
      setMessage({ ok: result.ok, text: result.message });
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="font-bold text-stone-950">Lista derivada del menú</p>
          <p className="mt-1 text-sm text-stone-600">
            Regenera después de cambiar una receta. Las unidades no se convierten.
          </p>
        </div>
        <button
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
          disabled={regenerating}
          onClick={regenerate}
          type="button"
        >
          {regenerating ? "Regenerando..." : "Regenerar lista"}
        </button>
      </div>

      {message && (
        <p
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role={message.ok ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-10 text-center">
          <p className="font-bold text-stone-900">La lista está vacía</p>
          <p className="mt-2 text-sm text-stone-600">
            Añade recetas al menú o pulsa regenerar para obtener sus ingredientes.
          </p>
        </div>
      ) : (
        <ShoppingItems
          items={items}
          onToggle={toggleItem}
          pendingIds={pendingIds}
        />
      )}
    </div>
  );
}
