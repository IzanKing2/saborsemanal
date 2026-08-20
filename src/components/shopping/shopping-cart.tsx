"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ShoppingListContent } from "@/components/shopping/shopping-list";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  clearShoppingListAction,
  regenerateShoppingListAction,
  removeExtraItemAction,
  removeShoppingItemAction,
  setExtraItemPurchasedAction,
  setShoppingItemPurchasedAction,
} from "@/lib/actions/lista-compra";
import {
  consolidateShoppingList,
  type ShoppingListItem,
  type ShoppingRecipeIngredient,
} from "@/lib/shopping-list";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMonday } from "@/lib/week";

type CartRow = ShoppingListItem & { removable: boolean };

type StoredPurchase = { cantidad: number; comprado: boolean };

const purchasesKey = (week: string) => `saborsemanal:shopping:${week}`;
const clearedKey = (week: string) => `saborsemanal:shopping:cleared:${week}`;
const removedItemsKey = (week: string) => `saborsemanal:shopping:removed:${week}`;

type RemovedItems = { signature: string; ids: string[] };

const parseObject = (value: string | null): Record<string, string> => {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignore unreadable storage.
  }
  return {};
};

const parseList = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string");
    }
  } catch {
    // Ignore unreadable storage.
  }
  return [];
};

function recipeSignature(recipeIds: string[]) {
  return [...new Set(recipeIds)].sort().join("|");
}

function loadRemovedItems(week: string, signature: string) {
  try {
    const raw = localStorage.getItem(removedItemsKey(week));
    if (!raw) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (parsed as RemovedItems).signature === signature &&
      Array.isArray((parsed as RemovedItems).ids)
    ) {
      return new Set(
        (parsed as RemovedItems).ids.filter((id): id is string => typeof id === "string"),
      );
    }
  } catch {
    // Ignore unreadable storage.
  }
  return new Set<string>();
}

export function ShoppingCart({
  loggedIn,
  tone = "dark",
}: {
  loggedIn: boolean;
  tone?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CartRow[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const week = getCurrentMonday();
    const supabase = createClient();

    if (loggedIn) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: menu } = await supabase
        .from("menus_semanales")
        .select("id")
        .eq("semana_inicio", week)
        .maybeSingle();

      const { data: menuItems, error: menuError } = menu
        ? await supabase
            .from("shopping_list_items")
            .select(
              `id,
              ingrediente_id,
              nombre_personalizado,
              cantidad,
              unidad,
              comprado,
              ingredientes (nombre, categorias_ingredientes (nombre))`,
            )
            .eq("menu_id", menu.id)
            .order("created_at")
        : { data: [], error: null };
      const { data: extraRows, error: extraError } = await supabase
        .from("shopping_list_extra")
        .select(
          `id,
          ingrediente_id,
          nombre_personalizado,
          cantidad,
          unidad,
          comprado,
          ingredientes (nombre, categorias_ingredientes (nombre))`,
        )
        .order("created_at");

      if (menuError || extraError) {
        setRows([]);
        setLoading(false);
        return;
      }

      setRows([
        ...(menuItems ?? []).map((item) => ({
          id: item.id,
          nombre: item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
          categoria: item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
          cantidad: Number(item.cantidad),
          unidad: item.unidad,
          comprado: item.comprado,
          removable: false,
        })),
        ...(extraRows ?? []).map((item) => ({
          id: item.id,
          nombre: item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
          categoria: item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
          cantidad: Number(item.cantidad),
          unidad: item.unidad,
          comprado: item.comprado,
          removable: true,
        })),
      ]);
      setLoading(false);
      return;
    }

    try {
      const slotsRaw = localStorage.getItem(`saborsemanal:menu:${week}`);
      const poolRaw = localStorage.getItem(`saborsemanal:menu:pool:${week}`);
      const extraRaw = localStorage.getItem("saborsemanal:shopping:extra");

      const slots = parseObject(slotsRaw);
      const pool = parseList(poolRaw);
      const extraIds = parseList(extraRaw);
      const recipeIds = [...new Set([...Object.values(slots), ...pool, ...extraIds])];
      if (recipeIds.length === 0) {
        localStorage.removeItem(clearedKey(week));
        setRows([]);
        setLoading(false);
        return;
      }
      if (localStorage.getItem(clearedKey(week)) === recipeSignature(recipeIds)) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("recetas")
        .select(
          `id,
          receta_ingredientes (
            cantidad,
            unidad,
            ingrediente_id,
            nombre_personalizado,
            ingredientes (nombre, categorias_ingredientes (nombre))
          )`,
        )
        .eq("publica", true)
        .eq("aprobada", true)
        .in("id", recipeIds);
      if (error) {
        setRows([]);
        setLoading(false);
        return;
      }

      const recipes: { id: string; ingredientes: ShoppingRecipeIngredient[] }[] =
        (data ?? []).map((recipe) => ({
          id: recipe.id,
          ingredientes: recipe.receta_ingredientes.map((item) => ({
            ingredienteId: item.ingrediente_id,
            nombre:
              item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
            categoria:
              item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
            cantidad: Number(item.cantidad),
            unidad: item.unidad,
          })),
        }));

      const items = consolidateShoppingList(slots, recipes, [
        ...pool,
        ...extraIds,
      ]);
      const removedIds = loadRemovedItems(week, recipeSignature(recipeIds));

      let stored: Record<string, StoredPurchase> = {};
      try {
        const raw = localStorage.getItem(purchasesKey(week));
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            stored = parsed as Record<string, StoredPurchase>;
          }
        }
      } catch {
        // Fall back to unchecked items.
      }

      setRows(
        items
          .filter((item) => !removedIds.has(item.id))
          .map((item) => ({
            ...item,
            comprado:
              stored[item.id]?.cantidad === item.cantidad &&
              stored[item.id]?.comprado === true,
            removable: true,
          })),
      );
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, [loggedIn]);

  useEffect(() => {
    load();
  }, [load, loggedIn]);

  useEffect(() => {
    if (!open) return;
    load();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, load]);

  function toggleItem(item: ShoppingListItem, purchased: boolean) {
    const row = item as CartRow;
    setRows((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, comprado: purchased }
          : candidate,
      ),
    );

    if (!loggedIn) {
      const week = getCurrentMonday();
      try {
        const raw = localStorage.getItem(purchasesKey(week));
        let stored: Record<string, StoredPurchase> = {};
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            stored = parsed as Record<string, StoredPurchase>;
          }
        }
        stored[item.id] = { cantidad: item.cantidad, comprado: purchased };
        localStorage.setItem(purchasesKey(week), JSON.stringify(stored));
        setMessage({ ok: true, text: "Lista guardada en este dispositivo." });
      } catch {
        setMessage({
          ok: false,
          text: "El navegador no pudo guardar el cambio.",
        });
      }
      return;
    }

    setPendingIds((current) => new Set(current).add(item.id));
    setMessage(null);
    startTransition(async () => {
      const result = row.removable
        ? await setExtraItemPurchasedAction(item.id, purchased)
        : await setShoppingItemPurchasedAction(item.id, purchased);
      if (!result.ok) {
        setRows((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? (item as CartRow) : candidate,
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
    const row = item as CartRow;
    setPendingIds((current) => new Set(current).add(item.id));
    setMessage(null);

    if (!loggedIn) {
      try {
        const week = getCurrentMonday();
        const slots = parseObject(
          localStorage.getItem(`saborsemanal:menu:${week}`),
        );
        const pool = parseList(
          localStorage.getItem(`saborsemanal:menu:pool:${week}`),
        );
        const extraIds = parseList(
          localStorage.getItem("saborsemanal:shopping:extra"),
        );
        const signature = recipeSignature([
          ...Object.values(slots),
          ...pool,
          ...extraIds,
        ]);
        const removedIds = loadRemovedItems(week, signature);
        removedIds.add(item.id);
        localStorage.setItem(
          removedItemsKey(week),
          JSON.stringify({ signature, ids: [...removedIds] }),
        );
        setRows((current) =>
          current.filter((candidate) => candidate.id !== item.id),
        );
        setMessage({ ok: true, text: "Ingrediente retirado de la lista." });
      } catch {
        setMessage({
          ok: false,
          text: "El navegador no pudo retirar el ingrediente.",
        });
      }
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      return;
    }

    startTransition(async () => {
      const result = row.removable
        ? await removeExtraItemAction(item.id)
        : await removeShoppingItemAction(item.id);
      if (result.ok) {
        setRows((current) =>
          current.filter((candidate) => candidate.id !== item.id),
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

  function regenerate() {
    setRegenerating(true);
    setMessage(null);
    startTransition(async () => {
      const result = await regenerateShoppingListAction(getCurrentMonday());
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) await load();
      setRegenerating(false);
    });
  }

  function clearList() {
    const week = getCurrentMonday();
    setClearing(true);
    setMessage(null);

    if (!loggedIn) {
      try {
        const slots = parseObject(
          localStorage.getItem(`saborsemanal:menu:${week}`),
        );
        const pool = parseList(
          localStorage.getItem(`saborsemanal:menu:pool:${week}`),
        );
        const remainingRecipeIds = [...Object.values(slots), ...pool];
        const signature = recipeSignature(remainingRecipeIds);

        localStorage.removeItem("saborsemanal:shopping:extra");
        localStorage.removeItem(purchasesKey(week));
        localStorage.removeItem(removedItemsKey(week));
        if (signature) {
          localStorage.setItem(clearedKey(week), signature);
        } else {
          localStorage.removeItem(clearedKey(week));
        }

        setRows([]);
        setMessage({ ok: true, text: "Lista de la compra vaciada." });
      } catch {
        setMessage({
          ok: false,
          text: "El navegador no pudo vaciar la lista.",
        });
      }
      setClearing(false);
      setClearOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await clearShoppingListAction(week);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) setRows([]);
      setClearing(false);
      setClearOpen(false);
    });
  }

  const dark = tone === "dark";
  const count = rows.length;

  return (
    <>
      <button
        aria-label="Abrir lista de la compra"
        aria-haspopup="dialog"
        className={`relative rounded-lg p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
          dark
            ? "text-emerald-100 hover:bg-emerald-900 focus-visible:outline-amber-300"
            : "text-stone-600 hover:bg-stone-200/60 focus-visible:outline-emerald-700"
        }`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.8h8.4a2 2 0 0 0 1.95-1.57L21 8H6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="20.5" r="1.3" />
          <circle cx="17.5" cy="20.5" r="1.3" />
        </svg>
        {count > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black ${
              dark
                ? "bg-amber-300 text-emerald-950"
                : "bg-emerald-800 text-white"
            }`}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <aside
              aria-label="Lista de la compra"
              aria-modal="true"
              className="animate-cart-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#f6f3ea] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
            <header className="flex items-center justify-between border-b border-stone-200 bg-emerald-950 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                  Carrito
                </p>
                <h2 className="text-xl font-black">Lista de la compra</h2>
              </div>
              <button
                aria-label="Cerrar"
                className="rounded-lg p-2 text-emerald-100 hover:bg-emerald-900 hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading ? (
                <p className="py-8 text-center text-sm text-stone-500" role="status">
                  Cargando tu lista...
                </p>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-bold text-stone-800">
                    Tu lista está vacía
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    Añade recetas al menú o pulsa «Añadir a la lista» en
                    cualquier receta del catálogo.
                  </p>
                  <Link
                    className="mt-6 inline-block rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                    href="/recetas"
                    onClick={() => setOpen(false)}
                  >
                    Explorar recetas
                  </Link>
                </div>
              ) : (
                <ShoppingListContent
                  items={rows}
                  onRemove={removeItem}
                  onToggle={toggleItem}
                  pendingIds={pendingIds}
                />
              )}
            </div>

            {message && (
              <div className="border-t border-stone-200 px-5 py-3">
                <p
                  className={`text-sm ${
                    message.ok ? "text-emerald-800" : "text-red-700"
                  }`}
                  role={message.ok ? "status" : "alert"}
                >
                  {message.text}
                </p>
              </div>
            )}

            <footer className="flex flex-col gap-3 border-t border-stone-200 bg-white px-5 py-4">
              <button
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={clearing || rows.length === 0}
                onClick={() => setClearOpen(true)}
                type="button"
              >
                {clearing ? "Vaciando..." : "Vaciar lista"}
              </button>
              {loggedIn && (
                <button
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                  disabled={regenerating}
                  onClick={regenerate}
                  type="button"
                >
                  {regenerating ? "Regenerando..." : "Regenerar lista"}
                </button>
              )}
              <Link
                className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
                href={
                  loggedIn
                    ? `/dashboard/lista-compra?week=${getCurrentMonday()}`
                    : "/planificador"
                }
                onClick={() => setOpen(false)}
              >
                {loggedIn ? "Ver lista completa" : "Abrir planificador"}
              </Link>
            </footer>
            </aside>
          </div>,
          document.body,
        )}
      <ConfirmDialog
        busy={clearing}
        confirmLabel="Sí, vaciar lista"
        description="Se eliminarán todos los ingredientes que ves ahora en el carrito. Tu menú semanal no se borra; podrás volver a generar la lista si lo necesitas."
        onCancel={() => setClearOpen(false)}
        onConfirm={clearList}
        open={clearOpen}
        title="¿Vaciar la lista de la compra?"
        tone="danger"
      />
    </>
  );
}
