import { MEAL_TYPES, WEEK_DAYS, menuSlotKey, type MealType, type WeekDay } from "@/lib/week";

/**
 * Una comida colocada en un hueco del calendario. `raciones` a null significa
 * "las porciones que trae la receta"; `esSobra` marca una comida que reutiliza
 * una preparación anterior y que, por tanto, no vuelve a comprarse.
 */
export type PlannedMeal = {
  recipeId: string;
  raciones: number | null;
  esSobra: boolean;
};

export type PlannerSlots = Record<string, PlannedMeal>;

export const MAX_SERVINGS = 100;

export function plannedServings(
  meal: Pick<PlannedMeal, "raciones">,
  recipeServings: number,
) {
  return meal.raciones ?? recipeServings;
}

export function isValidServings(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_SERVINGS;
}

export function allSlotKeys() {
  return new Set(
    WEEK_DAYS.flatMap((day) => MEAL_TYPES.map((meal) => menuSlotKey(day, meal))),
  );
}

export function parseSlotKey(key: string): { day: WeekDay; meal: MealType } | null {
  const [day, meal] = key.split("|");
  return WEEK_DAYS.includes(day as WeekDay) && MEAL_TYPES.includes(meal as MealType)
    ? { day: day as WeekDay, meal: meal as MealType }
    : null;
}

/**
 * Lee el menú guardado en el navegador del modo invitado. La versión anterior
 * guardaba `{"Lunes|Cena": "<id>"}`, así que un valor de texto se sigue
 * aceptando y se interpreta como una comida sin raciones propias.
 */
export function normalizeStoredSlots(
  value: unknown,
  isKnownRecipe: (recipeId: string) => boolean,
): PlannerSlots {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const validKeys = allSlotKeys();
  const slots: PlannerSlots = {};

  for (const [key, raw] of Object.entries(value).slice(0, 28)) {
    if (!validKeys.has(key)) continue;

    if (typeof raw === "string") {
      if (isKnownRecipe(raw)) {
        slots[key] = { recipeId: raw, raciones: null, esSobra: false };
      }
      continue;
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as Record<string, unknown>;
    const recipeId = candidate.recipeId;
    if (typeof recipeId !== "string" || !isKnownRecipe(recipeId)) continue;

    const raciones = candidate.raciones;
    slots[key] = {
      recipeId,
      raciones:
        typeof raciones === "number" && isValidServings(raciones) ? raciones : null,
      esSobra: candidate.esSobra === true,
    };
  }

  return slots;
}

/**
 * Sobras: una comida solo puede reutilizar una preparación de la misma receta
 * que esté planificada antes en la semana. Sin ese cocinado previo la etiqueta
 * no significaría nada y los ingredientes desaparecerían de la compra.
 */
export function hasEarlierPreparation(
  slots: PlannerSlots,
  key: string,
  recipeId: string,
) {
  const position = slotOrder(key);
  if (position < 0) return false;

  return Object.entries(slots).some(
    ([otherKey, meal]) =>
      otherKey !== key &&
      meal.recipeId === recipeId &&
      !meal.esSobra &&
      slotOrder(otherKey) < position,
  );
}

function slotOrder(key: string) {
  const parsed = parseSlotKey(key);
  if (!parsed) return -1;
  return WEEK_DAYS.indexOf(parsed.day) * MEAL_TYPES.length +
    MEAL_TYPES.indexOf(parsed.meal);
}

export type PlannerSummary = {
  meals: number;
  leftovers: number;
  recipes: number;
};

export function summarizeWeek(slots: PlannerSlots): PlannerSummary {
  const values = Object.values(slots);
  return {
    meals: values.length,
    leftovers: values.filter((meal) => meal.esSobra).length,
    recipes: new Set(
      values.filter((meal) => !meal.esSobra).map((meal) => meal.recipeId),
    ).size,
  };
}
