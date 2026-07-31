"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";

import { RecipeSlotModal } from "@/components/recipes/recipe-slot-modal";
import { saveMenuSlotAction } from "@/lib/actions/planificador";
import type { ShoppingRecipeIngredient } from "@/lib/shopping-list";
import {
  MEAL_TYPES,
  WEEK_DAYS,
  addDays,
  addWeeks,
  getCurrentMonday,
  menuSlotKey,
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
  initialPool: string[];
  mode: "cloud" | "local";
  basePath: string;
};

const MAX_SUGGESTIONS = 12;

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
  initialPool,
  mode,
  basePath,
}: WeeklyPlannerProps) {
  const [slots, setSlots] = useState(initialSlots);
  const [pool, setPool] = useState<string[]>(initialPool);
  const [query, setQuery] = useState("");
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const slotsKey = `saborsemanal:menu:${week}`;
  const poolKey = `saborsemanal:menu:pool:${week}`;

  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

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

    function loadPoolStored(value: string | null) {
      if (!value) {
        setPool([]);
        return;
      }

      const currentSlots = slotsRef.current;
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("Invalid local menu pool");
      }
      setPool(
        [
          ...new Set(
            parsed.filter(
              (recipeId): recipeId is string =>
                typeof recipeId === "string" &&
                validRecipeIds.has(recipeId) &&
                !Object.values(currentSlots).includes(recipeId),
            ),
          ),
        ].slice(0, 50),
      );
    }

    try {
      loadStored(localStorage.getItem(slotsKey));
      loadPoolStored(localStorage.getItem(poolKey));
    } catch {
      try {
        localStorage.removeItem(slotsKey);
        localStorage.removeItem(poolKey);
      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
      }
      setSlots({});
      setPool([]);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === slotsKey) {
        try {
          loadStored(event.newValue);
        } catch {
          setSlots({});
        }
      }
      if (event.key === poolKey) {
        try {
          loadPoolStored(event.newValue);
        } catch {
          setPool([]);
        }
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [mode, recipes, slotsKey, poolKey]);

  function persistLocal(nextSlots: PlannerSlots, nextPool: string[]) {
    try {
      localStorage.setItem(slotsKey, JSON.stringify(nextSlots));
      localStorage.setItem(poolKey, JSON.stringify(nextPool));
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

  function isRecipeInMenu(recipeId: string) {
    return (
      pool.includes(recipeId) || Object.values(slots).includes(recipeId)
    );
  }

  function setSlot(
    day: WeekDay,
    meal: MealType,
    recipeId: string,
    fromPool: boolean,
  ) {
    const key = menuSlotKey(day, meal);
    const previousRecipeId = slots[key] ?? null;
    const previousPool = pool;
    const nextSlots = { ...slots };
    if (recipeId) nextSlots[key] = recipeId;
    else delete nextSlots[key];
    const nextPool = fromPool
      ? pool.filter((id) => id !== recipeId)
      : pool;
    setSlots(nextSlots);
    setPool(nextPool);
    setMessage(null);

    if (mode === "local") {
      persistLocal(nextSlots, nextPool);
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
          setPool(previousPool);
        }
        setMessage({ ok: result.ok, text: result.message });
      } catch {
        setSlots((current) => {
          const rollback = { ...current };
          if (previousRecipeId) rollback[key] = previousRecipeId;
          else delete rollback[key];
          return rollback;
        });
        setPool(previousPool);
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

  const suggestions = recipes
    .filter((recipe) => {
      const normalizedQuery = query.trim().toLocaleLowerCase("es");
      return (
        !normalizedQuery ||
        recipe.titulo.toLocaleLowerCase("es").includes(normalizedQuery)
      );
    })
    .slice(0, MAX_SUGGESTIONS);

  const isCurrentWeek = getCurrentMonday() === week;
  const todayIndex = isCurrentWeek ? (new Date().getUTCDay() + 6) % 7 : -1;

  function confirmAdd(day: WeekDay, meal: MealType) {
    if (!addingRecipeId) return;
    const recipeId = addingRecipeId;
    setAddingRecipeId(null);
    setSlot(day, meal, recipeId, false);
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
        className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        aria-labelledby="add-recipes-heading"
      >
        <header className="bg-emerald-950 px-5 py-3 text-white">
          <h2 className="text-lg font-bold" id="add-recipes-heading">
            1 · Añade recetas
          </h2>
        </header>
        <div className="p-5">
          <label
            className="mb-1 block text-sm font-medium text-stone-700"
            htmlFor="planner-recipe-query"
          >
            Buscar por título
          </label>
          <input
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="planner-recipe-query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. tortilla, lentejas, pollo..."
            type="search"
            value={query}
          />
          <ul className="mt-4 divide-y divide-stone-100">
            {suggestions.map((recipe) => {
              const added = isRecipeInMenu(recipe.id);
              return (
                <li
                  className="flex items-center justify-between gap-3 py-3"
                  key={recipe.id}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      {recipe.imagenUrl ? (
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="48px"
                          src={recipe.imagenUrl}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] font-bold text-stone-400">
                          Sin foto
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <Link
                        className="block truncate font-semibold text-stone-900 hover:text-emerald-800 hover:underline"
                        href={`/recetas/${recipe.id}`}
                      >
                        {recipe.titulo}
                      </Link>
                      {recipe.etiqueta && (
                        <span className="text-xs font-semibold text-emerald-700">
                          {recipe.etiqueta}
                        </span>
                      )}
                    </span>
                  </span>
                  <button
                    className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={added}
                    onClick={() => setAddingRecipeId(recipe.id)}
                    type="button"
                  >
                    {added ? "En el menú" : "Añadir"}
                  </button>
                </li>
              );
            })}
            {suggestions.length === 0 && (
              <li className="py-4 text-sm text-stone-500">
                No se encontraron recetas.{" "}
                <Link className="font-bold text-emerald-700 underline" href="/recetas">
                  Explorar el catálogo
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section
        aria-label="Calendario semanal"
        className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm"
      >
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
                    {formatDay(week, dayIndex)}
                  </p>
                </header>
                <div className="space-y-4 p-3">
                  {MEAL_TYPES.map((meal) => {
                    const key = menuSlotKey(day, meal);
                    const selectId = `slot-${dayIndex}-${meal}`;
                    const selectedRecipeId = slots[key];
                    const selectedRecipeIsUnavailable =
                      Boolean(selectedRecipeId) &&
                      !recipes.some((recipe) => recipe.id === selectedRecipeId);
                    return (
                      <div key={meal}>
                        <label
                          className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500"
                          htmlFor={selectId}
                        >
                          {meal}
                        </label>
                        <select
                          className="w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:opacity-50"
                          disabled={pending.has(`slot:${key}`)}
                          id={selectId}
                          onChange={(event) =>
                            setSlot(
                              day,
                              meal,
                              event.target.value,
                              pool.includes(event.target.value),
                            )
                          }
                          value={slots[key] ?? ""}
                        >
                          <option value="">Sin receta</option>
                          {selectedRecipeIsUnavailable && (
                            <option value={selectedRecipeId}>
                              Receta no disponible
                            </option>
                          )}
                          {selectedRecipeId && !selectedRecipeIsUnavailable && (
                            <option value={selectedRecipeId}>
                              {recipesById.get(selectedRecipeId)?.titulo ?? ""}
                            </option>
                          )}
                          {pool
                            .filter((recipeId) => recipeId !== selectedRecipeId)
                            .map((recipeId) => (
                              <option key={recipeId} value={recipeId}>
                                {recipesById.get(recipeId)?.titulo ?? "Receta"}
                              </option>
                            ))}
                        </select>
                        {pending.has(`slot:${key}`) && (
                          <p className="mt-2 text-xs text-stone-500" role="status">
                            Guardando...
                          </p>
                        )}
                        {selectedRecipeId && !selectedRecipeIsUnavailable && (
                          <Link
                            className="mt-1 inline-block text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
                            href={`/recetas/${selectedRecipeId}`}
                          >
                            Ver detalles
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {addingRecipeId &&
        (() => {
          const recipe = recipesById.get(addingRecipeId);
          return (
            <RecipeSlotModal
              imageUrl={recipe?.imagenUrl}
              onCancel={() => setAddingRecipeId(null)}
              onConfirm={confirmAdd}
              recipeTitle={recipe?.titulo ?? "Receta"}
            />
          );
        })()}
    </div>
  );
}
