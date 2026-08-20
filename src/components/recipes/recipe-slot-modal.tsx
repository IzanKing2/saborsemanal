"use client";

import Image from "next/image";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  MEAL_TYPES,
  WEEK_DAYS,
  formatWeekDay,
  getCurrentMonday,
  menuSlotKey,
  mondayOf,
  type MealType,
  type WeekDay,
} from "@/lib/week";

type RecipeSlotModalProps = {
  recipeTitle: string;
  imageUrl?: string | null;
  occupied?: Partial<Record<string, string>>;
  week: string;
  onWeekChange: (week: string) => void;
  onCancel: () => void;
  onConfirm: (day: WeekDay, meal: MealType) => void;
};

export function RecipeSlotModal({
  recipeTitle,
  imageUrl,
  occupied,
  week,
  onWeekChange,
  onCancel,
  onConfirm,
}: RecipeSlotModalProps) {
  const isCurrentWeek = week === getCurrentMonday();
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return createPortal(
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-700">
            Semana del {formatWeekDay(week, 0)} al {formatWeekDay(week, 6)}
            {isCurrentWeek && (
              <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-950">
                Actual
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="recipe-slot-week-picker">
              Elegir semana
            </label>
            <input
              className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="recipe-slot-week-picker"
              onChange={(event) => {
                if (event.target.value) onWeekChange(mondayOf(event.target.value));
              }}
              type="date"
              value={week}
            />
            {!isCurrentWeek && (
              <button
                className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
                onClick={() => onWeekChange(getCurrentMonday())}
                type="button"
              >
                Semana actual
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm font-medium text-stone-700">
          Elige día y comida
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5 overflow-hidden rounded-xl border border-stone-200">
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
              {MEAL_TYPES.map((meal) => {
                const takenBy = occupied?.[menuSlotKey(day, meal)];
                return (
                  <button
                    className={`rounded-md px-1 py-2 text-center text-xs font-semibold outline-none transition hover:bg-emerald-700 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                      takenBy
                        ? "bg-amber-50 text-amber-800"
                        : "text-stone-700"
                    }`}
                    key={meal}
                    onClick={() => onConfirm(day, meal)}
                    title={takenBy ? `Ya tiene: ${takenBy}` : undefined}
                    type="button"
                  >
                    {takenBy ? (
                      <span className="block truncate">{takenBy}</span>
                    ) : (
                      "＋"
                    )}
                  </button>
                );
              })}
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
    </div>,
    document.body,
  );
}
