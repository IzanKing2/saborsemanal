"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { MealType, WeekDay } from "@/lib/week";

type PoolRecipe = {
  id: string;
  titulo: string;
  imagenUrl?: string | null;
  etiqueta?: string;
};

type SlotPickerModalProps = {
  day: WeekDay;
  meal: MealType;
  pool: PoolRecipe[];
  currentRecipeId?: string;
  onAssign: (recipeId: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function SlotPickerModal({
  day,
  meal,
  pool,
  currentRecipeId,
  onAssign,
  onRemove,
  onClose,
}: SlotPickerModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredPool = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return normalizedQuery
      ? pool.filter((recipe) =>
          recipe.titulo.toLocaleLowerCase("es").includes(normalizedQuery),
        )
      : pool;
  }, [pool, query]);

  return (
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
        role="dialog"
      >
        <h2
          className="text-lg font-black text-stone-950"
          id="slot-picker-modal-title"
        >
          {day} · {meal}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Elige una receta de tu menú para este hueco.
        </p>

        <input
          className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en tu menú..."
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
          {filteredPool.map((recipe) => (
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
                {recipe.etiqueta && (
                  <span className="text-xs font-semibold text-emerald-700">
                    {recipe.etiqueta}
                  </span>
                )}
              </span>
            </button>
          ))}
          {filteredPool.length === 0 && (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              No hay recetas en tu menú para este hueco.
              <br />
              Añade recetas desde la sección de arriba.
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
    </div>
  );
}
