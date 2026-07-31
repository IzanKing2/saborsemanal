"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { addMenuRecipeAction } from "@/lib/actions/planificador";
import { getCurrentMonday } from "@/lib/week";

export function AddToMenuButton({
  recipeId,
  guest = false,
}: {
  recipeId: string;
  guest?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const week = getCurrentMonday();

  function handleAdd() {
    if (pending || state?.ok) return;

    if (guest) {
      setPending(true);
      try {
        const key = `saborsemanal:menu:pool:${week}`;
        let pool: string[] = [];
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              pool = parsed.filter(
                (recipeId): recipeId is string => typeof recipeId === "string",
              );
            }
          }
        } catch {
          // Ignore unreadable storage and start with an empty pool.
        }
        if (!pool.includes(recipeId)) pool = [...pool, recipeId];
        window.localStorage.setItem(key, JSON.stringify(pool));
      } catch {
        setState({ ok: false, message: "El navegador no pudo guardar la receta." });
        setPending(false);
        return;
      }
      router.push(`/planificador?week=${week}`);
      return;
    }

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
