"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import {
  isMealType,
  isWeekDay,
  parseMonday,
  type MealType,
  type WeekDay,
} from "@/lib/week";

export type MenuSlotInput = {
  week: string;
  day: WeekDay;
  meal: MealType;
  recipeId: string | null;
};

export type MenuSlotResult = {
  ok: boolean;
  message: string;
};

export async function saveMenuSlotAction(
  input: MenuSlotInput,
): Promise<MenuSlotResult> {
  if (
    parseMonday(input.week) !== input.week ||
    !isWeekDay(input.day) ||
    !isMealType(input.meal) ||
    (input.recipeId !== null && !isUuid(input.recipeId))
  ) {
    return { ok: false, message: "El cambio del menú no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const args = {
      p_week: input.week,
      p_day: input.day,
      p_meal: input.meal,
      ...(input.recipeId ? { p_recipe_id: input.recipeId } : {}),
    };
    const { error } = await supabase.rpc("save_menu_slot", args);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Esa receta no está disponible para tu menú."
            : "No se pudo guardar el cambio.",
      };
    }

    revalidatePath("/dashboard/planificador");
    return { ok: true, message: "Menú actualizado." };
  } catch {
    return { ok: false, message: "No se pudo guardar el cambio." };
  }
}
