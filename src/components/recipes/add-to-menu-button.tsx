"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { RecipeSlotModal } from "@/components/recipes/recipe-slot-modal";
import { saveMenuSlotAction } from "@/lib/actions/planificador";
import { getCurrentMonday, menuSlotKey, type MealType, type WeekDay } from "@/lib/week";

export function AddToMenuButton({
  recipeId,
  recipeTitle,
  guest = false,
}: {
  recipeId: string;
  recipeTitle: string;
  guest?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const week = getCurrentMonday();

  function confirmSlot(day: WeekDay, meal: MealType) {
    setAdding(false);

    if (guest) {
      setPending(true);
      try {
        const key = `saborsemanal:menu:${week}`;
        const slotKey = menuSlotKey(day, meal);
        let slots: Record<string, string> = {};
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              slots = parsed as Record<string, string>;
            }
          }
        } catch {
          // Ignore unreadable storage and start with an empty menu.
        }
        slots[slotKey] = recipeId;
        window.localStorage.setItem(key, JSON.stringify(slots));
      } catch {
        setState({
          ok: false,
          message: "El navegador no pudo guardar la receta.",
        });
        setPending(false);
        return;
      }
      router.push(`/planificador?week=${week}`);
      return;
    }

    setPending(true);
    startTransition(async () => {
      const result = await saveMenuSlotAction({ week, day, meal, recipeId });
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
        onClick={() => setAdding(true)}
        type="button"
      >
        {pending ? "Añadiendo..." : "Añadir al menú"}
      </button>
      {state?.message && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
      {adding && (
        <RecipeSlotModal
          onCancel={() => setAdding(false)}
          onConfirm={confirmSlot}
          recipeTitle={recipeTitle}
        />
      )}
    </div>
  );
}
