"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useDialogFocus } from "@/lib/use-dialog-focus";
import type { MealType, WeekDay } from "@/lib/week";

export type PickableRecipe = {
  id: string;
  titulo: string;
  imagenUrl?: string | null;
  etiqueta?: string;
  porciones?: number;
  tipoComida?: string[];
  tiempoPreparacion?: number;
  esFavorita?: boolean;
  esMia?: boolean;
  ingredienteIds?: string[];
};

const MAX_RESULTS = 24;
const QUICK_MINUTES = 25;

type PickerFilter = "sugeridas" | "menu" | "favoritas" | "mias" | "todas";

const FILTERS: Array<{ id: PickerFilter; label: string }> = [
  { id: "sugeridas", label: "Para ti" },
  { id: "menu", label: "En tu menú" },
  { id: "favoritas", label: "Favoritas" },
  { id: "mias", label: "Mis recetas" },
  { id: "todas", label: "Todas" },
];

type SlotPickerModalProps = {
  day: WeekDay;
  meal: MealType;
  recipes: PickableRecipe[];
  currentRecipeId?: string;
  usageCounts?: Map<string, number>;
  /** Ingredientes ya presentes en la semana, para sugerir aprovecharlos. */
  weekIngredientIds?: Set<string>;
  onAssign: (recipeId: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function SlotPickerModal({
  day,
  meal,
  recipes,
  currentRecipeId,
  usageCounts,
  weekIngredientIds,
  onAssign,
  onRemove,
  onClose,
}: SlotPickerModalProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PickerFilter>("sugeridas");
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  // Puntuación deliberadamente simple y con datos que ya existen: tipo de
  // comida del hueco, favoritas, recetas rápidas e ingredientes que ya vas a
  // comprar esta semana. Sin histórico ni recomendador.
  const scored = useMemo(() => {
    return recipes.map((recipe) => {
      let score = 0;
      const reasons: string[] = [];
      if (recipe.tipoComida?.includes(meal)) {
        score += 3;
        reasons.push(`Para ${meal.toLocaleLowerCase("es")}`);
      }
      if (recipe.esFavorita) {
        score += 2;
        reasons.push("Favorita");
      }
      if (recipe.tiempoPreparacion && recipe.tiempoPreparacion <= QUICK_MINUTES) {
        score += 1;
        reasons.push(`${recipe.tiempoPreparacion} min`);
      }
      if (
        weekIngredientIds?.size &&
        recipe.ingredienteIds?.some((id) => weekIngredientIds.has(id))
      ) {
        score += 1;
        reasons.push("Aprovecha ingredientes");
      }
      return { recipe, score, reasons };
    });
  }, [recipes, meal, weekIngredientIds]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    let pool = scored;

    // Buscar siempre manda: ningún filtro puede esconder una receta concreta.
    if (!normalizedQuery) {
      if (filter === "favoritas") {
        pool = pool.filter((entry) => entry.recipe.esFavorita);
      } else if (filter === "mias") {
        pool = pool.filter((entry) => entry.recipe.esMia);
      } else if (filter === "menu") {
        pool = pool.filter((entry) => (usageCounts?.get(entry.recipe.id) ?? 0) > 0);
      } else if (filter === "sugeridas") {
        const relevant = pool.filter((entry) => entry.score > 0);
        pool = relevant.length > 0 ? relevant : pool;
      }
    } else {
      pool = pool.filter((entry) =>
        entry.recipe.titulo.toLocaleLowerCase("es").includes(normalizedQuery),
      );
    }

    return [...pool]
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.recipe.titulo.localeCompare(right.recipe.titulo, "es"),
      )
      .slice(0, MAX_RESULTS);
  }, [scored, query, filter, usageCounts]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="slot-picker-modal-title"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <h2
          className="text-lg font-black text-stone-950"
          id="slot-picker-modal-title"
        >
          {day} · {meal}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Elige una receta para este hueco.
        </p>

        <input
          autoFocus
          className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca cualquier receta..."
          type="search"
          value={query}
        />

        {!query.trim() && (
          <div
            aria-label="Filtros rápidos"
            className="mt-3 flex gap-1.5 overflow-x-auto pb-1"
            role="tablist"
          >
            {FILTERS.map((option) => (
              <button
                aria-selected={filter === option.id}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  filter === option.id
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-stone-300 bg-white text-stone-600 hover:border-emerald-700"
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 -mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
          {currentRecipeId && (
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100"
              onClick={onRemove}
              type="button"
            >
              Quitar receta de este hueco
            </button>
          )}
          {filteredRecipes.map(({ recipe, reasons }) => {
            const count = usageCounts?.get(recipe.id) ?? 0;
            const subtitle =
              count > 0
                ? `En el menú${count > 1 ? ` ×${count}` : ""}`
                : reasons.length > 0
                  ? reasons.slice(0, 2).join(" · ")
                  : recipe.etiqueta;
            return (
              <button
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left transition hover:border-emerald-700 hover:bg-emerald-50"
                key={recipe.id}
                onClick={() => onAssign(recipe.id)}
                type="button"
              >
                <span className="relative block size-11 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {recipe.imagenUrl ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="44px"
                      src={recipe.imagenUrl}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full items-center justify-center text-lg"
                    >
                      🍽️
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-stone-900">
                    {recipe.titulo}
                  </span>
                  {subtitle && (
                    <span className="block truncate text-xs font-semibold text-emerald-700">
                      {subtitle}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {filteredRecipes.length === 0 && (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              No se encontraron recetas.
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
