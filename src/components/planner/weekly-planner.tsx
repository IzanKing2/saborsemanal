"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { SlotPickerModal } from "@/components/planner/slot-picker-modal";
import { saveMenuSlotAction } from "@/lib/actions/planificador";
import type { ShoppingRecipeIngredient } from "@/lib/shopping-list";
import {
  MEAL_TYPES,
  WEEK_DAYS,
  addWeeks,
  formatWeekDay,
  getCurrentMonday,
  menuSlotKey,
  mondayOf,
  type MealType,
  type WeekDay,
} from "@/lib/week";

export type PlannerRecipe = {
  id: string;
  titulo: string;
  etiqueta?: string;
  imagenUrl?: string | null;
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

export function WeeklyPlanner({
  week,
  recipes,
  initialSlots,
  mode,
  basePath,
}: WeeklyPlannerProps) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [editingSlot, setEditingSlot] = useState<{
    day: WeekDay;
    meal: MealType;
  } | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const slotsKey = `saborsemanal:menu:${week}`;

  const recipesById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

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
            .slice(0, 28)
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
      loadStored(localStorage.getItem(slotsKey));
    } catch {
      try {
        localStorage.removeItem(slotsKey);
      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
      }
      setSlots({});
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === slotsKey) {
        try {
          loadStored(event.newValue);
        } catch {
          setSlots({});
        }
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [mode, recipes, slotsKey]);

  function persistLocal(nextSlots: PlannerSlots) {
    try {
      localStorage.setItem(slotsKey, JSON.stringify(nextSlots));
      setMessage({ ok: true, text: "Menú guardado en este dispositivo." });
      return true;
    } catch {
      setMessage({
        ok: false,
        text: "El navegador no pudo guardar este cambio.",
      });
      return false;
    }
  }

  function setSlot(day: WeekDay, meal: MealType, recipeId: string) {
    const key = menuSlotKey(day, meal);
    const previousRecipeId = slots[key] ?? null;
    const nextSlots = { ...slots };
    if (recipeId) nextSlots[key] = recipeId;
    else delete nextSlots[key];
    setSlots(nextSlots);
    setMessage(null);

    if (mode === "local") {
      persistLocal(nextSlots);
      return;
    }

    setPending((current) => new Set(current).add(`slot:${key}`));
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
        setPending((current) => {
          const next = new Set(current);
          next.delete(`slot:${key}`);
          return next;
        });
      }
    });
  }

  const usageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const recipeId of Object.values(slots)) {
      counts.set(recipeId, (counts.get(recipeId) ?? 0) + 1);
    }
    return counts;
  }, [slots]);

  const currentMonday = getCurrentMonday();
  const isCurrentWeek = currentMonday === week;
  const todayIndex = isCurrentWeek ? (new Date().getUTCDay() + 6) % 7 : -1;

  function closePicker() {
    setEditingSlot(null);
  }

  function goToWeek(monday: string) {
    router.push(`${basePath}?week=${monday}`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="rounded-lg border border-stone-300 px-4 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
          href={`${basePath}?week=${addWeeks(week, -1)}`}
        >
          ← Semana anterior
        </Link>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Semana del
          </p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-stone-950">
              {formatWeekDay(week, 0)} al {formatWeekDay(week, 6)}
            </p>
            {isCurrentWeek && (
              <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-emerald-950">
                Semana actual
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="planner-week-picker">
              Ir a una semana concreta
            </label>
            <input
              className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="planner-week-picker"
              onChange={(event) => {
                if (event.target.value) goToWeek(mondayOf(event.target.value));
              }}
              type="date"
              value={week}
            />
            {!isCurrentWeek && (
              <button
                className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
                onClick={() => goToWeek(currentMonday)}
                type="button"
              >
                Ir a la semana actual
              </button>
            )}
          </div>
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
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-amber-950">¿Ya tienes el menú listo?</p>
            <p className="mt-1 text-sm text-amber-800">
              Revisa la lista consolidada de la semana desde el carrito del menú
              superior.
            </p>
          </div>
        </div>
      )}

      <section
        aria-label="Calendario semanal"
        className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
      >
        <header className="bg-emerald-950 px-5 py-3 text-white">
          <h2 className="text-lg font-bold">Organiza tu semana</h2>
        </header>
        <div className="overflow-x-auto">
          <div className="grid min-w-[950px] grid-cols-7 divide-x divide-stone-200">
            {WEEK_DAYS.map((day, dayIndex) => {
              const isToday = dayIndex === todayIndex;
              return (
                <section className="min-w-0" key={day}>
                  <header
                    className={`px-3 py-3 text-center ${
                      isToday
                        ? "bg-amber-300 text-emerald-950"
                        : "bg-emerald-950 text-white"
                    }`}
                  >
                    <p className="text-sm font-black">{day}</p>
                    <p
                      className={`mt-0.5 text-xs font-semibold ${
                        isToday ? "text-emerald-800" : "text-emerald-200"
                      }`}
                    >
                      {formatWeekDay(week, dayIndex)}
                    </p>
                  </header>
                  <div className="space-y-4 p-3">
                    {MEAL_TYPES.map((meal) => {
                      const key = menuSlotKey(day, meal);
                      const selectedRecipeId = slots[key];
                      const selectedRecipe = selectedRecipeId
                        ? recipesById.get(selectedRecipeId)
                        : undefined;
                      const selectedRecipeIsUnavailable =
                        Boolean(selectedRecipeId) && !selectedRecipe;
                      const slotPending = pending.has(`slot:${key}`);
                      return (
                        <div key={meal}>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                            {meal}
                          </p>
                          {selectedRecipeIsUnavailable ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                              <p className="text-xs font-semibold text-red-700">
                                Receta no disponible
                              </p>
                              <button
                                className="mt-2 text-xs font-bold text-red-700 underline hover:text-red-900"
                                disabled={slotPending}
                                onClick={() => setSlot(day, meal, "")}
                                type="button"
                              >
                                Quitar
                              </button>
                              {slotPending && (
                                <p
                                  className="mt-2 text-xs text-stone-500"
                                  role="status"
                                >
                                  Guardando...
                                </p>
                              )}
                            </div>
                          ) : selectedRecipe ? (
                            <div className="relative rounded-xl border border-stone-200 bg-white p-2 shadow-sm transition hover:border-emerald-700">
                              <button
                                className="flex w-full items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                                disabled={slotPending}
                                onClick={() => setEditingSlot({ day, meal })}
                                type="button"
                              >
                                <span className="relative block size-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                                  {selectedRecipe.imagenUrl ? (
                                    <Image
                                      alt=""
                                      className="object-cover"
                                      fill
                                      sizes="40px"
                                      src={selectedRecipe.imagenUrl}
                                    />
                                  ) : (
                                    <span className="flex h-full items-center justify-center text-[9px] font-bold text-stone-400">
                                      Sin foto
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-bold text-stone-900">
                                    {selectedRecipe.titulo}
                                  </span>
                                  <span className="block text-[10px] font-semibold text-emerald-700">
                                    Cambiar
                                  </span>
                                </span>
                              </button>
                              <button
                                aria-label={`Quitar ${selectedRecipe.titulo} del hueco`}
                                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-stone-200 text-xs font-black text-stone-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={slotPending}
                                onClick={() => setSlot(day, meal, "")}
                                type="button"
                              >
                                ×
                              </button>
                              {slotPending && (
                                <p
                                  className="mt-2 text-xs text-stone-500"
                                  role="status"
                                >
                                  Guardando...
                                </p>
                              )}
                              <Link
                                className="mt-1 inline-block text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
                                href={`/recetas/${selectedRecipe.id}`}
                              >
                                Ver detalles
                              </Link>
                            </div>
                          ) : (
                            <button
                              className="w-full rounded-xl border border-dashed border-stone-300 px-2 py-4 text-center text-xs font-bold text-stone-400 outline-none transition hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700"
                              disabled={slotPending}
                              onClick={() => setEditingSlot({ day, meal })}
                              type="button"
                            >
                              ＋ Añadir
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      {editingSlot && (
        <SlotPickerModal
          currentRecipeId={slots[menuSlotKey(editingSlot.day, editingSlot.meal)]}
          day={editingSlot.day}
          meal={editingSlot.meal}
          onAssign={(recipeId) => {
            setSlot(editingSlot.day, editingSlot.meal, recipeId);
            closePicker();
          }}
          onClose={closePicker}
          onRemove={() => {
            setSlot(editingSlot.day, editingSlot.meal, "");
            closePicker();
          }}
          recipes={recipes}
          usageCounts={usageCounts}
        />
      )}
    </div>
  );
}
