"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { MealCard } from "@/components/planner/meal-card";
import { SlotPickerModal } from "@/components/planner/slot-picker-modal";
import { SlotTargetModal } from "@/components/planner/slot-target-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast, useToast } from "@/components/ui/toast";
import {
  copyMenuWeekAction,
  moveMenuSlotAction,
  saveMenuSlotAction,
} from "@/lib/actions/planificador";
import {
  hasEarlierPreparation,
  normalizeStoredSlots,
  parseSlotKey,
  summarizeWeek,
  type PlannedMeal,
  type PlannerSlots,
} from "@/lib/planner";
import { consolidateShoppingList, type ShoppingRecipeIngredient } from "@/lib/shopping-list";
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
  porciones: number;
  tipoComida?: string[];
  tiempoPreparacion?: number;
  esFavorita?: boolean;
  esMia?: boolean;
  ingredientes?: ShoppingRecipeIngredient[];
};

export type { PlannerSlots };

type WeeklyPlannerProps = {
  week: string;
  recipes: PlannerRecipe[];
  initialSlots: PlannerSlots;
  mode: "cloud" | "local";
  basePath: string;
  shoppingListHref?: string;
};

type SlotRef = { day: WeekDay; meal: MealType };
type TargetPurpose = "move" | "duplicate";

export function WeeklyPlanner({
  week,
  recipes,
  initialSlots,
  mode,
  basePath,
  shoppingListHref,
}: WeeklyPlannerProps) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [slots, setSlots] = useState(initialSlots);
  const [editingSlot, setEditingSlot] = useState<SlotRef | null>(null);
  const [targetSlot, setTargetSlot] = useState<
    { origin: SlotRef; purpose: TargetPurpose } | null
  >(null);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slotsKey = `saborsemanal:menu:${week}`;
  const recipeIdsRef = useRef(new Set(recipes.map((recipe) => recipe.id)));

  const recipesById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

  useEffect(() => {
    recipeIdsRef.current = new Set(recipes.map((recipe) => recipe.id));
  }, [recipes]);

  // Cuando el servidor vuelve a renderizar (router.refresh tras copiar una
  // semana, revalidación de una acción...) las props traen el menú real. Sin
  // esto el estado se quedaría en el valor inicial y el calendario ignoraría
  // los cambios hechos fuera de esta pantalla.
  const initialSignature = JSON.stringify(initialSlots);
  useEffect(() => {
    // Nunca mientras haya un guardado en vuelo: pisaría el cambio optimista
    // con una respuesta del servidor todavía anterior a él.
    if (mode !== "cloud" || pendingKeys.size > 0 || busy) return;
    setSlots(JSON.parse(initialSignature) as PlannerSlots);
  }, [initialSignature, mode, pendingKeys.size, busy]);

  useEffect(() => {
    if (mode !== "local") return;

    function loadStored(value: string | null) {
      if (!value) {
        setSlots({});
        return;
      }
      setSlots(
        normalizeStoredSlots(JSON.parse(value) as unknown, (recipeId) =>
          recipeIdsRef.current.has(recipeId),
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
  }, [mode, slotsKey]);

  function persistLocal(nextSlots: PlannerSlots) {
    try {
      localStorage.setItem(slotsKey, JSON.stringify(nextSlots));
      return true;
    } catch {
      return false;
    }
  }

  function markPending(keys: string[], active: boolean) {
    setPendingKeys((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (active) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  /**
   * Todo cambio se pinta al instante y se confirma después: si el servidor lo
   * rechaza se revierte al estado anterior y el aviso lo explica. El feedback
   * va siempre por toast flotante para no mover el calendario.
   */
  function applyChange(
    nextSlots: PlannerSlots,
    keys: string[],
    run: () => Promise<{ ok: boolean; message: string }>,
    successText = "Menú actualizado",
  ) {
    const previousSlots = slots;
    setSlots(nextSlots);

    if (mode === "local") {
      if (persistLocal(nextSlots)) {
        showToast(`✓ ${successText}`);
      } else {
        setSlots(previousSlots);
        showToast("El navegador no pudo guardar el cambio.", "error");
      }
      return;
    }

    markPending(keys, true);
    showToast("Guardando...", "pending");
    startTransition(async () => {
      try {
        const result = await run();
        if (!result.ok) {
          setSlots(previousSlots);
          showToast(result.message, "error");
          return;
        }
        showToast(`✓ ${successText}`);
      } catch {
        setSlots(previousSlots);
        showToast("No se pudo guardar el cambio.", "error");
      } finally {
        markPending(keys, false);
      }
    });
  }

  function writeSlot(day: WeekDay, meal: MealType, value: PlannedMeal | null) {
    const key = menuSlotKey(day, meal);
    const nextSlots = { ...slots };
    if (value) nextSlots[key] = value;
    else delete nextSlots[key];

    applyChange(
      nextSlots,
      [key],
      () =>
        saveMenuSlotAction({
          week,
          day,
          meal,
          recipeId: value?.recipeId ?? null,
          raciones: value?.raciones ?? null,
          esSobra: value?.esSobra ?? false,
        }),
      value ? "Menú actualizado" : "Comida quitada",
    );
  }

  function moveSlot(from: SlotRef, to: SlotRef) {
    const fromKey = menuSlotKey(from.day, from.meal);
    const toKey = menuSlotKey(to.day, to.meal);
    if (fromKey === toKey) return;

    const source = slots[fromKey];
    if (!source) return;

    const nextSlots = { ...slots };
    const target = slots[toKey];
    nextSlots[toKey] = source;
    // Un hueco ocupado no se pisa: las dos comidas se intercambian.
    if (target) nextSlots[fromKey] = target;
    else delete nextSlots[fromKey];

    applyChange(
      nextSlots,
      [fromKey, toKey],
      () => moveMenuSlotAction({ week, from, to }),
      target ? "Comidas intercambiadas" : "Comida movida",
    );
  }

  function duplicateSlot(origin: SlotRef, to: SlotRef) {
    const source = slots[menuSlotKey(origin.day, origin.meal)];
    if (!source) return;
    writeSlot(to.day, to.meal, { ...source });
  }

  function copyPreviousWeek() {
    setCopyConfirmOpen(false);
    const previousWeek = addWeeks(week, -1);

    if (mode === "local") {
      let stored: PlannerSlots = {};
      try {
        const raw = localStorage.getItem(`saborsemanal:menu:${previousWeek}`);
        stored = raw
          ? normalizeStoredSlots(JSON.parse(raw) as unknown, (recipeId) =>
              recipeIdsRef.current.has(recipeId),
            )
          : {};
      } catch {
        stored = {};
      }

      const nextSlots = { ...slots };
      let copied = 0;
      for (const [key, meal] of Object.entries(stored)) {
        if (nextSlots[key]) continue;
        nextSlots[key] = meal;
        copied += 1;
      }
      if (copied === 0) {
        showToast("No había comidas nuevas que copiar.");
        return;
      }
      setSlots(nextSlots);
      const stored2 = persistLocal(nextSlots);
      showToast(
        stored2
          ? `✓ ${copied} ${copied === 1 ? "comida copiada" : "comidas copiadas"}`
          : "El navegador no pudo guardar el cambio.",
        stored2 ? "ok" : "error",
      );
      return;
    }

    setBusy(true);
    showToast("Copiando semana anterior...", "pending");
    startTransition(async () => {
      const result = await copyMenuWeekAction({
        fromWeek: previousWeek,
        toWeek: week,
        // Nunca sobrescribe: solo rellena huecos libres, así repetir la acción
        // es inofensivo y no hay forma de perder lo ya planificado.
        overwrite: false,
      });
      setBusy(false);
      showToast(
        result.ok ? `✓ ${result.message}` : result.message,
        result.ok ? "ok" : "error",
      );
      if (result.ok && result.copied > 0) router.refresh();
    });
  }

  const usageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const meal of Object.values(slots)) {
      counts.set(meal.recipeId, (counts.get(meal.recipeId) ?? 0) + 1);
    }
    return counts;
  }, [slots]);

  const weekIngredientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const meal of Object.values(slots)) {
      for (const ingredient of recipesById.get(meal.recipeId)?.ingredientes ?? []) {
        if (ingredient.ingredienteId) ids.add(ingredient.ingredienteId);
      }
    }
    return ids;
  }, [slots, recipesById]);

  const summary = useMemo(() => summarizeWeek(slots), [slots]);
  const ingredientCount = useMemo(
    () => consolidateShoppingList(slots, recipes).length,
    [slots, recipes],
  );

  const currentMonday = getCurrentMonday();
  const isCurrentWeek = currentMonday === week;
  const todayIndex = isCurrentWeek ? (new Date().getUTCDay() + 6) % 7 : -1;
  const isEmptyWeek = summary.meals === 0;

  function goToWeek(monday: string) {
    router.push(`${basePath}?week=${monday}`);
  }

  function recipeTitleById(recipeId: string) {
    return recipesById.get(recipeId)?.titulo ?? "Receta no disponible";
  }

  function renderSlot(day: WeekDay, meal: MealType) {
    const key = menuSlotKey(day, meal);
    const planned = slots[key];
    const recipe = planned ? recipesById.get(planned.recipeId) : undefined;
    const isPending = pendingKeys.has(key);
    const isDropTarget = dropKey === key && draggingKey !== key;

    return (
      <div
        className={`rounded-xl transition ${
          isDropTarget ? "ring-2 ring-emerald-600 ring-offset-1" : ""
        }`}
        onDragLeave={() => setDropKey((current) => (current === key ? null : current))}
        onDragOver={(event) => {
          if (!draggingKey) return;
          event.preventDefault();
          setDropKey(key);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const origin = draggingKey ? parseSlotKey(draggingKey) : null;
          setDraggingKey(null);
          setDropKey(null);
          if (origin) moveSlot(origin, { day, meal });
        }}
      >
        {planned && !recipe ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">
              Receta no disponible
            </p>
            <button
              className="mt-2 text-xs font-bold text-red-700 underline hover:text-red-900"
              disabled={isPending}
              onClick={() => writeSlot(day, meal, null)}
              type="button"
            >
              Quitar
            </button>
          </div>
        ) : planned && recipe ? (
          <MealCard
            canBeLeftover={hasEarlierPreparation(slots, key, planned.recipeId)}
            day={day}
            dragging={draggingKey === key}
            meal={planned}
            mealType={meal}
            onChange={() => setEditingSlot({ day, meal })}
            onDragEnd={() => {
              setDraggingKey(null);
              setDropKey(null);
            }}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", key);
              event.dataTransfer.effectAllowed = "move";
              setDraggingKey(key);
            }}
            onDuplicate={() =>
              setTargetSlot({ origin: { day, meal }, purpose: "duplicate" })
            }
            onMove={() => setTargetSlot({ origin: { day, meal }, purpose: "move" })}
            onRemove={() => writeSlot(day, meal, null)}
            onServingsChange={(raciones) =>
              writeSlot(day, meal, { ...planned, raciones })
            }
            onToggleLeftover={() =>
              writeSlot(day, meal, { ...planned, esSobra: !planned.esSobra })
            }
            pending={isPending}
            recipe={recipe}
          />
        ) : (
          <button
            aria-label={`Añadir receta en ${day}, ${meal}`}
            className="w-full rounded-xl border border-dashed border-stone-300 px-2 py-3 text-center text-xs font-bold text-stone-400 transition hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            disabled={isPending}
            onClick={() => setEditingSlot({ day, meal })}
            type="button"
          >
            ＋ Añadir
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <Link
            aria-label="Semana anterior"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
            href={`${basePath}?week=${addWeeks(week, -1)}`}
          >
            ←
          </Link>
          <Link
            aria-label="Semana siguiente"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
            href={`${basePath}?week=${addWeeks(week, 1)}`}
          >
            →
          </Link>
          {!isCurrentWeek && (
            <button
              className="rounded-lg px-2.5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
              onClick={() => goToWeek(currentMonday)}
              type="button"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate text-base font-black text-stone-950">
            {formatWeekDay(week, 0)} — {formatWeekDay(week, 6)}
            {isCurrentWeek && (
              <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-wide text-emerald-950">
                Actual
              </span>
            )}
          </p>
          <label className="sr-only" htmlFor="planner-week-picker">
            Ir a una semana concreta
          </label>
          <input
            className="mt-1 rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="planner-week-picker"
            onChange={(event) => {
              if (event.target.value) goToWeek(mondayOf(event.target.value));
            }}
            type="date"
            value={week}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              isEmptyWeek ? copyPreviousWeek() : setCopyConfirmOpen(true)
            }
            type="button"
          >
            Copiar semana anterior
          </button>
        </div>
      </div>

      {recipes.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No hay recetas disponibles. Crea una receta propia o espera a que se
          publique contenido en el catálogo.
        </div>
      )}

      {isEmptyWeek ? (
        <div className="mb-4 rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-center">
          <p className="text-base font-black text-stone-900">
            Planifica tu semana
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Añade recetas a cada día, arrástralas para reorganizarlas y marca las
            sobras para no comprar de más.
          </p>
          <button
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={busy}
            onClick={copyPreviousWeek}
            type="button"
          >
            Copiar semana anterior
          </button>
        </div>
      ) : (
        shoppingListHref && (
          <Link
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-700"
            href={`${shoppingListHref}?week=${week}`}
          >
            <span>
              <span className="block text-sm font-bold text-stone-900">
                Revisar lista de compra
              </span>
              <span className="block text-xs text-stone-500">
                {summary.recipes}{" "}
                {summary.recipes === 1 ? "receta" : "recetas"} ·{" "}
                {ingredientCount}{" "}
                {ingredientCount === 1 ? "ingrediente" : "ingredientes"}
                {summary.leftovers > 0 && ` · ${summary.leftovers} con sobras`}
              </span>
            </span>
            <span aria-hidden="true" className="text-lg text-emerald-700">
              →
            </span>
          </Link>
        )
      )}

      {/* Escritorio: la semana completa de un vistazo. */}
      <section
        aria-label="Calendario semanal"
        className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:block"
      >
        <div className="grid grid-cols-7 divide-x divide-stone-200">
          {WEEK_DAYS.map((day, dayIndex) => (
            <section className="min-w-0" key={day}>
              <header
                className={`px-2 py-2.5 text-center ${
                  dayIndex === todayIndex
                    ? "bg-amber-300 text-emerald-950"
                    : "bg-emerald-950 text-white"
                }`}
              >
                <p className="text-sm font-black">{day}</p>
                <p
                  className={`text-xs font-semibold ${
                    dayIndex === todayIndex ? "text-emerald-800" : "text-emerald-200"
                  }`}
                >
                  {formatWeekDay(week, dayIndex)}
                </p>
              </header>
              <div className="space-y-2.5 p-2">
                {MEAL_TYPES.map((meal) => (
                  <div key={meal}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {meal}
                    </p>
                    {renderSlot(day, meal)}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* Móvil y tablet: un día tras otro, sin scroll horizontal ni columnas
          estrechas. Las tarjetas conservan el mismo tamaño táctil. */}
      <div className="space-y-3 lg:hidden">
        {WEEK_DAYS.map((day, dayIndex) => (
          <section
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            key={day}
          >
            <header
              className={`flex items-baseline justify-between px-4 py-2.5 ${
                dayIndex === todayIndex
                  ? "bg-amber-300 text-emerald-950"
                  : "bg-emerald-950 text-white"
              }`}
            >
              <h2 className="text-sm font-black">{day}</h2>
              <p
                className={`text-xs font-semibold ${
                  dayIndex === todayIndex ? "text-emerald-800" : "text-emerald-200"
                }`}
              >
                {formatWeekDay(week, dayIndex)}
              </p>
            </header>
            <div className="divide-y divide-stone-100">
              {MEAL_TYPES.map((meal) => (
                <div
                  className="flex items-center gap-3 px-3 py-2.5"
                  key={meal}
                >
                  <p className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    {meal}
                  </p>
                  <div className="min-w-0 flex-1">{renderSlot(day, meal)}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Toast toast={toast} />

      {editingSlot && (
        <SlotPickerModal
          currentRecipeId={
            slots[menuSlotKey(editingSlot.day, editingSlot.meal)]?.recipeId
          }
          day={editingSlot.day}
          meal={editingSlot.meal}
          onAssign={(recipeId) => {
            const key = menuSlotKey(editingSlot.day, editingSlot.meal);
            const current = slots[key];
            writeSlot(editingSlot.day, editingSlot.meal, {
              recipeId,
              // Cambiar de receta reinicia raciones y sobra: pertenecían a la
              // preparación anterior.
              raciones: current?.recipeId === recipeId ? current.raciones : null,
              esSobra: current?.recipeId === recipeId ? current.esSobra : false,
            });
            setEditingSlot(null);
          }}
          onClose={() => setEditingSlot(null)}
          onRemove={() => {
            writeSlot(editingSlot.day, editingSlot.meal, null);
            setEditingSlot(null);
          }}
          recipes={recipes}
          usageCounts={usageCounts}
          weekIngredientIds={weekIngredientIds}
        />
      )}

      {targetSlot && (
        <SlotTargetModal
          description={
            targetSlot.purpose === "move"
              ? "Elige el hueco al que quieres moverla. Si está ocupado, las dos comidas se intercambian."
              : "Elige dónde quieres repetir esta comida."
          }
          onClose={() => setTargetSlot(null)}
          onSelect={(day, meal) => {
            if (targetSlot.purpose === "move") {
              moveSlot(targetSlot.origin, { day, meal });
            } else {
              duplicateSlot(targetSlot.origin, { day, meal });
            }
            setTargetSlot(null);
          }}
          originKey={menuSlotKey(targetSlot.origin.day, targetSlot.origin.meal)}
          recipeTitleById={recipeTitleById}
          slots={slots}
          title={targetSlot.purpose === "move" ? "Mover comida" : "Duplicar comida"}
          week={week}
        />
      )}

      <ConfirmDialog
        busy={busy}
        cancelLabel="Cancelar"
        confirmLabel="Rellenar huecos vacíos"
        description="Esta semana ya tiene comidas planificadas. Se copiarán solo las de la semana anterior que caigan en huecos libres; lo que ya has puesto no se toca."
        onCancel={() => setCopyConfirmOpen(false)}
        onConfirm={copyPreviousWeek}
        open={copyConfirmOpen}
        title="¿Copiar la semana anterior?"
      />
    </div>
  );
}
