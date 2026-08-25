"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useDialogFocus } from "@/lib/use-dialog-focus";
import type { MealType, WeekDay } from "@/lib/week";

type PickableRecipe = {
  id: string;
  titulo: string;
  imagenUrl?: string | null;
  etiqueta?: string;
};

const MAX_RESULTS = 20;

type SlotPickerModalProps = {
  day: WeekDay;
  meal: MealType;
  recipes: PickableRecipe[];
  currentRecipeId?: string;
  usageCounts?: Map<string, number>;
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
  onAssign,
  onRemove,
  onClose,
}: SlotPickerModalProps) {
  const [query, setQuery] = useState("");

  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const matches = normalizedQuery
      ? recipes.filter((recipe) =>
          recipe.titulo.toLocaleLowerCase("es").includes(normalizedQuery),
        )
      : recipes;
    return matches.slice(0, MAX_RESULTS);
  }, [recipes, query]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="slot-picker-modal-title"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-xl"
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
          Busca y elige una receta para este hueco.
        </p>

        <input
          autoFocus
          className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej. tortilla, lentejas, pollo..."
          type="search"
          value={query}
        />

        <div className="mt-4 -mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
          {currentRecipeId && (
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-left text-sm font-semibold text-red-700 outline-none transition hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400"
              onClick={onRemove}
              type="button"
            >
              Quitar receta de este hueco
            </button>
          )}
          {filteredRecipes.map((recipe) => {
            const count = usageCounts?.get(recipe.id) ?? 0;
            return (
              <button
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left outline-none transition hover:border-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-700"
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
                    <span className="flex h-full items-center justify-center text-[9px] font-bold text-stone-400">
                      Sin foto
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-stone-900">
                    {recipe.titulo}
                  </span>
                  {count > 0 ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      En el menú{count > 1 ? ` ×${count}` : ""}
                    </span>
                  ) : (
                    recipe.etiqueta && (
                      <span className="text-xs font-semibold text-emerald-700">
                        {recipe.etiqueta}
                      </span>
                    )
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

        <div className="mt-5 flex justify-end">
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
