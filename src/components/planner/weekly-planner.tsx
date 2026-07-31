"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";

import { LocalShoppingList } from "@/components/shopping/shopping-list";
import {
  addMenuRecipeAction,
  removeMenuRecipeAction,
  saveMenuSlotAction,
} from "@/lib/actions/planificador";
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
  initialPool: string[];
  mode: "cloud" | "local";
  basePath: string;
};

type DraftAssignment = {
  day: WeekDay;
  meal: MealType;
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
  const [drafts, setDrafts] = useState<Record<string, DraftAssignment>>({});
  const [localReady, setLocalReady] = useState(mode !== "local");
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
    setLocalReady(true);

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

  function addRecipe(recipeId: string) {
    if (isRecipeInMenu(recipeId)) return;

    const nextPool = [...pool, recipeId];
    const previousPool = pool;
    setPool(nextPool);
    setMessage(null);

    if (mode === "local") {
      persistLocal(slots, nextPool);
      return;
    }

    setPending((current) => new Set(current).add(`pool:${recipeId}`));
    startTransition(async () => {
      try {
        const result = await addMenuRecipeAction({ week, recipeId });
        if (!result.ok) setPool(previousPool);
        setMessage({ ok: result.ok, text: result.message });
      } catch {
        setPool(previousPool);
        setMessage({ ok: false, text: "No se pudo añadir la receta." });
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(`pool:${recipeId}`);
          return next;
        });
      }
    });
  }

  function removeRecipe(recipeId: string) {
    const nextSlots = { ...slots };
    for (const [key, value] of Object.entries(nextSlots)) {
      if (value === recipeId) delete nextSlots[key];
    }
    const nextPool = pool.filter((id) => id !== recipeId);
    const previousSlots = slots;
    const previousPool = pool;
    setSlots(nextSlots);
    setPool(nextPool);
    setMessage(null);

    if (mode === "local") {
      persistLocal(nextSlots, nextPool);
      return;
    }

    setPending((current) => new Set(current).add(`pool:${recipeId}`));
    startTransition(async () => {
      try {
        const result = await removeMenuRecipeAction({ week, recipeId });
        if (!result.ok) {
          setSlots(previousSlots);
          setPool(previousPool);
        }
        setMessage({ ok: result.ok, text: result.message });
      } catch {
        setSlots(previousSlots);
        setPool(previousPool);
        setMessage({ ok: false, text: "No se pudo retirar la receta." });
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(`pool:${recipeId}`);
          return next;
        });
      }
    });
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

  function assignDraft(recipeId: string) {
    const draft = drafts[recipeId] ?? { day: "Lunes", meal: "Almuerzo" };
    if (!isRecipeInMenu(recipeId)) {
      addRecipe(recipeId);
      return;
    }
    setSlot(draft.day, draft.meal, recipeId, true);
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
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-stone-900">
                      {recipe.titulo}
                    </span>
                    {recipe.etiqueta && (
                      <span className="text-xs font-semibold text-emerald-700">
                        {recipe.etiqueta}
                      </span>
                    )}
                  </span>
                  <button
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={added || pending.has(`pool:${recipe.id}`)}
                    onClick={() => addRecipe(recipe.id)}
                    type="button"
                  >
                    {pending.has(`pool:${recipe.id}`)
                      ? "Añadiendo..."
                      : added
                        ? "En el menú"
                        : "Añadir"}
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
        className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        aria-labelledby="pool-heading"
      >
        <header className="bg-amber-800 px-5 py-3 text-white">
          <h2 className="text-lg font-bold" id="pool-heading">
            2 · Sin asignar ({pool.length})
          </h2>
        </header>
        {pool.length === 0 ? (
          <p className="px-5 py-4 text-sm text-stone-500">
            Añade recetas arriba y quedarán aquí hasta que las coloques en un
            día y una comida.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {pool.map((recipeId) => {
              const recipe = recipesById.get(recipeId);
              const draft = drafts[recipeId] ?? { day: "Lunes", meal: "Almuerzo" };
              return (
                <li
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  key={recipeId}
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-stone-900">
                    {recipe?.titulo ?? "Receta no disponible"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Día"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [recipeId]: {
                            ...draft,
                            day: event.target.value as WeekDay,
                          },
                        }))
                      }
                      value={draft.day}
                    >
                      {WEEK_DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Comida"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [recipeId]: {
                            ...draft,
                            meal: event.target.value as MealType,
                          },
                        }))
                      }
                      value={draft.meal}
                    >
                      {MEAL_TYPES.map((meal) => (
                        <option key={meal} value={meal}>
                          {meal}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={pending.has(`slot:${menuSlotKey(draft.day, draft.meal)}`)}
                      onClick={() => assignDraft(recipeId)}
                      type="button"
                    >
                      Colocar
                    </button>
                    <button
                      className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={pending.has(`pool:${recipeId}`)}
                      onClick={() => removeRecipe(recipeId)}
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
            <div className="grid divide-y divide-stone-100 md:grid-cols-4 md:divide-x md:divide-y-0">
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
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {mode === "local" && localReady && (
        <LocalShoppingList pool={pool} recipes={recipes} slots={slots} week={week} />
      )}
    </div>
  );
}
