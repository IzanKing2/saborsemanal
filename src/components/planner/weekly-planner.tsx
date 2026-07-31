"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { LocalShoppingList } from "@/components/shopping/shopping-list";
import { saveMenuSlotAction } from "@/lib/actions/planificador";
import type { ShoppingRecipeIngredient } from "@/lib/shopping-list";
import {
  MEAL_TYPES,
  WEEK_DAYS,
  addDays,
  addWeeks,
  menuSlotKey,
  type MealType,
  type WeekDay,
} from "@/lib/week";

export type PlannerRecipe = {
  id: string;
  titulo: string;
  etiqueta?: string;
  ingredientes?: ShoppingRecipeIngredient[];
};

export type PlannerSlots = Record<string, string>;

type WeeklyPlannerProps = {
  week: string;
  recipes: PlannerRecipe[];
  initialSlots: PlannerSlots;
  mode: "cloud" | "local";
  basePath: string;
};

function formatDay(week: string, dayIndex: number) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(addDays(week, dayIndex));
}

export function WeeklyPlanner({
  week,
  recipes,
  initialSlots,
  mode,
  basePath,
}: WeeklyPlannerProps) {
  const [slots, setSlots] = useState(initialSlots);
  const [localReady, setLocalReady] = useState(mode !== "local");
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const storageKey = `saborsemanal:menu:${week}`;

  useEffect(() => {
    if (mode !== "local") return;

    const validKeys = new Set(
      WEEK_DAYS.flatMap((day) =>
        MEAL_TYPES.map((meal) => menuSlotKey(day, meal)),
      ),
    );
    const validRecipeIds = new Set(recipes.map((recipe) => recipe.id));

    function loadStored(value: string | null) {
      if (!value) {
        setSlots({});
        return;
      }

      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid local menu");
      }
      setSlots(
        Object.fromEntries(
          Object.entries(parsed)
            .slice(0, 21)
            .filter(
              ([key, recipeId]) =>
                validKeys.has(key) &&
                typeof recipeId === "string" &&
                validRecipeIds.has(recipeId),
            ),
        ),
      );
    }

    try {
      loadStored(localStorage.getItem(storageKey));
    } catch {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
      }
      setSlots({});
    }
    setLocalReady(true);

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      try {
        loadStored(event.newValue);
      } catch {
        setSlots({});
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [mode, recipes, storageKey]);

  function updateSlot(day: WeekDay, meal: MealType, recipeId: string) {
    const key = menuSlotKey(day, meal);
    const previousRecipeId = slots[key];
    const nextSlots = { ...slots };
    if (recipeId) nextSlots[key] = recipeId;
    else delete nextSlots[key];
    setSlots(nextSlots);
    setMessage(null);

    if (mode === "local") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextSlots));
        setMessage({ ok: true, text: "Menú guardado en este dispositivo." });
      } catch {
        setSlots((current) => {
          const rollback = { ...current };
          if (previousRecipeId) rollback[key] = previousRecipeId;
          else delete rollback[key];
          return rollback;
        });
        setMessage({
          ok: false,
          text: "El navegador no pudo guardar este cambio.",
        });
      }
      return;
    }

    setPendingSlots((current) => new Set(current).add(key));
    startTransition(async () => {
      try {
        const result = await saveMenuSlotAction({
          week,
          day,
          meal,
          recipeId: recipeId || null,
        });
        if (!result.ok) {
          setSlots((current) => {
            const rollback = { ...current };
            if (previousRecipeId) rollback[key] = previousRecipeId;
            else delete rollback[key];
            return rollback;
          });
        }
        setMessage({ ok: result.ok, text: result.message });
      } catch {
        setSlots((current) => {
          const rollback = { ...current };
          if (previousRecipeId) rollback[key] = previousRecipeId;
          else delete rollback[key];
          return rollback;
        });
        setMessage({ ok: false, text: "No se pudo guardar el cambio." });
      } finally {
        setPendingSlots((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <Link
          className="rounded-lg border border-stone-300 px-4 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
          href={`${basePath}?week=${addWeeks(week, -1)}`}
        >
          ← Semana anterior
        </Link>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Semana del
          </p>
          <p className="mt-1 text-lg font-black text-stone-950">
            {formatDay(week, 0)} al {formatDay(week, 6)}
          </p>
        </div>
        <Link
          className="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-800"
          href={`${basePath}?week=${addWeeks(week, 1)}`}
        >
          Semana siguiente →
        </Link>
      </div>

      {message && (
        <p
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            !message.ok
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role={message.ok ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      {recipes.length === 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No hay recetas disponibles. Crea una receta propia o espera a que se
          publique contenido en el catálogo.
        </div>
      )}

      {mode === "cloud" && (
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-amber-950">¿Ya tienes el menú listo?</p>
            <p className="mt-1 text-sm text-amber-800">
              Consolida todos sus ingredientes en una lista sincronizada.
            </p>
          </div>
          <Link
            className="rounded-lg bg-amber-300 px-4 py-2 text-center text-sm font-bold text-amber-950 hover:bg-amber-200"
            href={`/dashboard/lista-compra?week=${week}`}
          >
            Abrir lista de compra
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {WEEK_DAYS.map((day, dayIndex) => (
          <section
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            key={day}
          >
            <header className="flex items-baseline justify-between bg-emerald-950 px-5 py-3 text-white">
              <h2 className="text-lg font-bold">{day}</h2>
              <span className="text-xs font-semibold text-emerald-200">
                {formatDay(week, dayIndex)}
              </span>
            </header>
            <div className="grid divide-y divide-stone-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {MEAL_TYPES.map((meal) => {
                const key = menuSlotKey(day, meal);
                const selectId = `slot-${dayIndex}-${meal}`;
                const selectedRecipeId = slots[key];
                const selectedRecipeIsUnavailable =
                  Boolean(selectedRecipeId) &&
                  !recipes.some((recipe) => recipe.id === selectedRecipeId);
                return (
                  <div className="p-4" key={meal}>
                    <label
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500"
                      htmlFor={selectId}
                    >
                      {meal}
                    </label>
                    <select
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:opacity-50"
                      disabled={pendingSlots.has(key)}
                      id={selectId}
                      onChange={(event) =>
                        updateSlot(day, meal, event.target.value)
                      }
                      value={slots[key] ?? ""}
                    >
                      <option value="">Sin receta</option>
                      {selectedRecipeIsUnavailable && (
                        <option value={selectedRecipeId}>
                          Receta no disponible
                        </option>
                      )}
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.titulo}
                          {recipe.etiqueta ? ` · ${recipe.etiqueta}` : ""}
                        </option>
                      ))}
                    </select>
                    {pendingSlots.has(key) && (
                      <p className="mt-2 text-xs text-stone-500" role="status">
                        Guardando...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {mode === "local" && localReady && (
        <LocalShoppingList recipes={recipes} slots={slots} week={week} />
      )}
    </div>
  );
}
