"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
  const [day, setDay] = useState<WeekDay>("Lunes");
  const [meal, setMeal] = useState<MealType>("Almuerzo");

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
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-slot-day"
            >
              Día
            </label>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="recipe-slot-day"
              onChange={(event) => setDay(event.target.value as WeekDay)}
              value={day}
            >
              {WEEK_DAYS.map((weekDay) => (
                <option key={weekDay} value={weekDay}>
                  {weekDay}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-slot-meal"
            >
              Comida
            </label>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="recipe-slot-meal"
              onChange={(event) => setMeal(event.target.value as MealType)}
              value={meal}
            >
              {MEAL_TYPES.map((mealType) => (
                <option key={mealType} value={mealType}>
                  {mealType}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            onClick={() => onConfirm(day, meal)}
            type="button"
          >
            Añadir al menú
          </button>
        </div>
      </div>
    </div>
  );
}
