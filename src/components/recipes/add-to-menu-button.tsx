"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { RecipeSlotModal } from "@/components/recipes/recipe-slot-modal";
import { saveMenuSlotAction } from "@/lib/actions/planificador";
import { createClient } from "@/lib/supabase/client";
import {
  getCurrentMonday,
  isMealType,
  isWeekDay,
  menuSlotKey,
  type MealType,
  type WeekDay,
} from "@/lib/week";

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
  const [occupied, setOccupied] = useState<Partial<Record<string, string>>>(
    {},
  );
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [week, setWeek] = useState(getCurrentMonday);

  useEffect(() => {
    if (!adding) return;
    let cancelled = false;
    const supabase = createClient();

    async function loadOccupied() {
      if (guest) {
        let slots: Record<string, string> = {};
        try {
          const raw = window.localStorage.getItem(`saborsemanal:menu:${week}`);
          const parsed: unknown = raw ? JSON.parse(raw) : {};
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            slots = parsed as Record<string, string>;
          }
        } catch {
          return;
        }

        const ids = [...new Set(Object.values(slots))];
        if (ids.length === 0) return;

        const { data } = await supabase
          .from("recetas")
          .select("id, titulo")
          .in("id", ids);
        if (cancelled) return;

        const titles = new Map((data ?? []).map((r) => [r.id, r.titulo]));
        const map: Partial<Record<string, string>> = {};
        for (const [key, id] of Object.entries(slots)) {
          map[key] = titles.get(id) ?? "Receta";
        }
        setOccupied(map);
        return;
      }

      const { data: menu } = await supabase
        .from("menus_semanales")
        .select("id")
        .eq("semana_inicio", week)
        .maybeSingle();
      if (!menu || cancelled) return;

      const { data: rows } = await supabase
        .from("menu_recetas")
        .select("dia_semana, tipo_comida, recetas(titulo)")
        .eq("menu_id", menu.id)
        .not("dia_semana", "is", null);
      if (cancelled || !rows) return;

      const map: Partial<Record<string, string>> = {};
      for (const row of rows) {
        if (isWeekDay(row.dia_semana ?? "") && isMealType(row.tipo_comida ?? "")) {
          map[menuSlotKey(row.dia_semana as WeekDay, row.tipo_comida as MealType)] =
            row.recetas?.titulo ?? "Receta";
        }
      }
      setOccupied(map);
    }

    loadOccupied();
    return () => {
      cancelled = true;
    };
  }, [adding, guest, week]);

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
      {state && (
        <p
          className={`mt-2 text-xs ${
            state.ok ? "font-semibold text-emerald-700" : "text-red-600"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.ok ? (
            <>
              {state.message}{" "}
              <Link
                className="underline hover:text-emerald-900"
                href={`/dashboard/planificador?week=${week}`}
              >
                Ver planificador
              </Link>
            </>
          ) : (
            state.message
          )}
        </p>
      )}
      {adding && (
        <RecipeSlotModal
          occupied={occupied}
          onCancel={() => setAdding(false)}
          onConfirm={confirmSlot}
          onWeekChange={setWeek}
          recipeTitle={recipeTitle}
          week={week}
        />
      )}
    </div>
  );
}
