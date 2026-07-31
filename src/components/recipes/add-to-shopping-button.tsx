"use client";

import { startTransition, useState } from "react";

import { addRecipeToShoppingListAction } from "@/lib/actions/lista-compra";

export function AddToShoppingButton({
  recipeId,
  guest = false,
}: {
  recipeId: string;
  guest?: boolean;
}) {
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  function handleAdd() {
    if (pending || state?.ok) return;

    if (guest) {
      try {
        const key = "saborsemanal:shopping:extra";
        let ids: string[] = [];
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              ids = parsed.filter(
                (id): id is string => typeof id === "string",
              );
            }
          }
        } catch {
          // Ignore unreadable storage and start with an empty list.
        }
        if (!ids.includes(recipeId)) ids = [...ids, recipeId];
        window.localStorage.setItem(key, JSON.stringify(ids));
      } catch {
        setState({
          ok: false,
          message: "El navegador no pudo guardar la receta.",
        });
        return;
      }
      setState({ ok: true, message: "Añadida a tu lista local." });
      return;
    }

    setPending(true);
    startTransition(async () => {
      const result = await addRecipeToShoppingListAction(recipeId);
      setState(result);
      setPending(false);
    });
  }

  if (state?.ok) {
    return (
      <p className="text-xs font-bold text-emerald-700">
        Añadida a la lista de la compra ✓
      </p>
    );
  }

  return (
    <div>
      <button
        className="inline-block rounded-full border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        onClick={handleAdd}
        type="button"
      >
        {pending ? "Añadiendo..." : "Añadir a la lista"}
      </button>
      {state?.message && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
