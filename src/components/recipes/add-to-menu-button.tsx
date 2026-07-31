"use client";

import Link from "next/link";
import { startTransition, useState } from "react";

import { addMenuRecipeAction } from "@/lib/actions/planificador";
import { getCurrentMonday } from "@/lib/week";

export function AddToMenuButton({ recipeId }: { recipeId: string }) {
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const week = getCurrentMonday();

  function handleAdd() {
    if (pending || state?.ok) return;
    setPending(true);
    startTransition(async () => {
      const result = await addMenuRecipeAction({ week, recipeId });
      setState(result);
      setPending(false);
    });
  }

  if (state?.ok) {
    return (
      <Link
        className="inline-block rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-950"
        href={`/dashboard/planificador?week=${week}`}
      >
        Añadida ✓ · Ver planificador
      </Link>
    );
  }

  return (
    <div>
      <button
        className="inline-block rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        onClick={handleAdd}
        type="button"
      >
        {pending ? "Añadiendo..." : "Añadir al menú"}
      </button>
      {state?.message && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
