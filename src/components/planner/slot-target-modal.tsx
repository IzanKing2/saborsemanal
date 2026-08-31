"use client";

import { createPortal } from "react-dom";

import { useDialogFocus } from "@/lib/use-dialog-focus";
import type { PlannerSlots } from "@/lib/planner";
import {
  MEAL_TYPES,
  WEEK_DAYS,
  formatWeekDay,
  menuSlotKey,
  type MealType,
  type WeekDay,
} from "@/lib/week";

type SlotTargetModalProps = {
  title: string;
  description: string;
  week: string;
  slots: PlannerSlots;
  originKey: string;
  recipeTitleById: (recipeId: string) => string;
  onSelect: (day: WeekDay, meal: MealType) => void;
  onClose: () => void;
};

/**
 * Elegir hueco para mover o duplicar. Es la alternativa accesible al arrastre:
 * todo se maneja con Tab y Enter, y cada botón dice si el hueco está ocupado.
 */
export function SlotTargetModal({
  title,
  description,
  week,
  slots,
  originKey,
  recipeTitleById,
  onSelect,
  onClose,
}: SlotTargetModalProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="slot-target-title"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <h2 className="text-lg font-black text-stone-950" id="slot-target-title">
          {title}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>

        <div className="mt-4 -mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
          {WEEK_DAYS.map((day, dayIndex) => (
            <div key={day}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
                {day}{" "}
                <span className="font-medium text-stone-400">
                  {formatWeekDay(week, dayIndex)}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MEAL_TYPES.map((meal) => {
                  const key = menuSlotKey(day, meal);
                  const occupant = slots[key];
                  const isOrigin = key === originKey;
                  return (
                    <button
                      aria-label={`${day}, ${meal}${
                        occupant
                          ? `. Ocupado por ${recipeTitleById(occupant.recipeId)}`
                          : ". Libre"
                      }`}
                      className={`rounded-xl border px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        occupant
                          ? "border-amber-200 bg-amber-50 hover:border-amber-500"
                          : "border-stone-200 bg-white hover:border-emerald-700 hover:bg-emerald-50"
                      }`}
                      disabled={isOrigin}
                      key={meal}
                      onClick={() => onSelect(day, meal)}
                      type="button"
                    >
                      <span className="block font-bold text-stone-800">{meal}</span>
                      <span className="block truncate text-[11px] text-stone-500">
                        {isOrigin
                          ? "Aquí está ahora"
                          : occupant
                            ? recipeTitleById(occupant.recipeId)
                            : "Libre"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50"
            onClick={onClose}
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
