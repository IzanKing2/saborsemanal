"use client";

import { startTransition, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { addRecipeToShoppingListAction } from "@/lib/actions/lista-compra";

export function AddToShoppingButton({
  recipeId,
  guest = false,
}: {
  recipeId: string;
  guest?: boolean;
}) {
  const showToast = useToast();
  // Solo hace falta recordar si ya se añadió: el botón pasa a confirmación
  // permanente. Los errores son pasajeros y van por aviso flotante.
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState(false);

  function handleAdd() {
    if (pending || added) return;

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
        showToast("El navegador no pudo guardar la receta.", "error");
        return;
      }
      setAdded(true);
      return;
    }

    setPending(true);
    startTransition(async () => {
      const result = await addRecipeToShoppingListAction(recipeId);
      if (result.ok) setAdded(true);
      else showToast(result.message, "error");
      setPending(false);
    });
  }

  if (added) {
    return (
      <p className="text-xs font-bold text-emerald-700">
        Añadida a la lista de la compra ✓
      </p>
    );
  }

  return (
    <button
      className="inline-block rounded-full border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      onClick={handleAdd}
      type="button"
    >
      {pending ? "Añadiendo..." : "Añadir a la lista"}
    </button>
  );
}
