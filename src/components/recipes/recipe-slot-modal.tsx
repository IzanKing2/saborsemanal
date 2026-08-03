"use client";

import Image from "next/image";
import { useEffect } from "react";

import { MEAL_TYPES, WEEK_DAYS, type MealType, type WeekDay } from "@/lib/week";

type RecipeSlotModalProps = {
  recipeTitle: string;
  imageUrl?: string | null;
  onCancel: () => void;
  onConfirm: (day: WeekDay, meal: MealType) => void;
};

export function RecipeSlotModal({
  recipeTitle,
  imageUrl,
  onCancel,
  onConfirm,
}: RecipeSlotModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        aria-labelledby="recipe-slot-modal-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2
          className="text-lg font-black text-stone-950"
          id="recipe-slot-modal-title"
        >
          Añadir al planificador
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
            {imageUrl ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="56px"
                src={imageUrl}
              />
            ) : (
              <span className="flex h-full items-center justify-center text-[10px] font-bold text-stone-400">
                Sin foto
              </span>
            )}
          </span>
          <p className="min-w-0 truncate text-sm font-semibold text-stone-700">
            {recipeTitle}
          </p>
        </div>

        <p className="mt-5 text-sm font-medium text-stone-700">
          Elige día y comida
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5 overflow-hidden rounded-xl border border-stone-200">
          <div className="bg-stone-100" />
          {MEAL_TYPES.map((meal) => (
            <p
              className="bg-stone-100 px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500"
              key={meal}
            >
              {meal}
            </p>
          ))}
          {WEEK_DAYS.map((day) => (
            <div className="contents" key={day}>
              <p className="flex items-center bg-stone-100 px-1 py-2 text-xs font-bold text-stone-600">
                {day}
              </p>
              {MEAL_TYPES.map((meal) => (
                <button
                  className="rounded-md px-1 py-2 text-center text-xs font-semibold text-stone-700 outline-none transition hover:bg-emerald-700 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-700"
                  key={meal}
                  onClick={() => onConfirm(day, meal)}
                  type="button"
                >
                  ＋
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
