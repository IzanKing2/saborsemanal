"use server";

import { revalidatePath } from "next/cache";

import { isValidServings } from "@/lib/planner";
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
  /** null usa las porciones de la receta. */
  raciones?: number | null;
  esSobra?: boolean;
};

export type MenuSlotResult = {
  ok: boolean;
  message: string;
};

export async function saveMenuSlotAction(
  input: MenuSlotInput,
): Promise<MenuSlotResult> {
  const raciones = input.raciones ?? null;
  if (
    parseMonday(input.week) !== input.week ||
    !isWeekDay(input.day) ||
    !isMealType(input.meal) ||
    (input.recipeId !== null && !isUuid(input.recipeId)) ||
    (raciones !== null && !isValidServings(raciones))
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
      ...(input.recipeId
        ? {
            p_recipe_id: input.recipeId,
            ...(raciones !== null ? { p_raciones: raciones } : {}),
            p_es_sobra: input.esSobra === true,
          }
        : {}),
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

export type MoveMenuSlotInput = {
  week: string;
  from: { day: WeekDay; meal: MealType };
  to: { day: WeekDay; meal: MealType };
};

/**
 * Mover y, si el destino está ocupado, intercambiar: el RPC lo resuelve en una
 * transacción para que un arrastre nunca deje la comida en tierra de nadie.
 */
export async function moveMenuSlotAction(
  input: MoveMenuSlotInput,
): Promise<MenuSlotResult> {
  if (
    parseMonday(input.week) !== input.week ||
    !isWeekDay(input.from.day) ||
    !isMealType(input.from.meal) ||
    !isWeekDay(input.to.day) ||
    !isMealType(input.to.meal)
  ) {
    return { ok: false, message: "El cambio del menú no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("move_menu_slot", {
      p_week: input.week,
      p_from_day: input.from.day,
      p_from_meal: input.from.meal,
      p_to_day: input.to.day,
      p_to_meal: input.to.meal,
    });
    if (error) {
      return { ok: false, message: "No se pudo mover la comida." };
    }

    revalidatePath("/dashboard/planificador");
    return { ok: true, message: "Menú actualizado." };
  } catch {
    return { ok: false, message: "No se pudo mover la comida." };
  }
}

export type CopyWeekResult = MenuSlotResult & { copied: number };

export async function copyMenuWeekAction(input: {
  fromWeek: string;
  toWeek: string;
  overwrite: boolean;
}): Promise<CopyWeekResult> {
  if (
    parseMonday(input.fromWeek) !== input.fromWeek ||
    parseMonday(input.toWeek) !== input.toWeek
  ) {
    return { ok: false, copied: 0, message: "La semana indicada no es válida." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, copied: 0, message: "Tu sesión ha caducado." };
    }

    const { data, error } = await supabase.rpc("copy_menu_week", {
      p_from_week: input.fromWeek,
      p_to_week: input.toWeek,
      p_overwrite: input.overwrite,
    });
    if (error) {
      return { ok: false, copied: 0, message: "No se pudo copiar la semana." };
    }

    const copied = typeof data === "number" ? data : 0;
    revalidatePath("/dashboard/planificador");
    return {
      ok: true,
      copied,
      message:
        copied > 0
          ? `${copied} ${copied === 1 ? "comida copiada" : "comidas copiadas"}.`
          : "La semana anterior no tenía comidas que copiar.",
    };
  } catch {
    return { ok: false, copied: 0, message: "No se pudo copiar la semana." };
  }
}

export type MenuRecipeInput = {
  week: string;
  recipeId: string;
};

export async function addMenuRecipeAction(
  input: MenuRecipeInput,
): Promise<MenuSlotResult> {
  if (parseMonday(input.week) !== input.week || !isUuid(input.recipeId)) {
    return { ok: false, message: "El cambio del menú no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("add_menu_recipe", {
      p_week: input.week,
      p_recipe_id: input.recipeId,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Esa receta no está disponible para tu menú."
            : "No se pudo añadir la receta.",
      };
    }

    revalidatePath("/dashboard/planificador");
    return { ok: true, message: "Receta añadida al menú." };
  } catch {
    return { ok: false, message: "No se pudo añadir la receta." };
  }
}

export async function removeMenuRecipeAction(
  input: MenuRecipeInput,
): Promise<MenuSlotResult> {
  if (parseMonday(input.week) !== input.week || !isUuid(input.recipeId)) {
    return { ok: false, message: "El cambio del menú no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("remove_menu_recipe", {
      p_week: input.week,
      p_recipe_id: input.recipeId,
    });
    if (error) {
      return {
        ok: false,
        message: "No se pudo quitar la receta.",
      };
    }

    revalidatePath("/dashboard/planificador");
    return { ok: true, message: "Receta quitada del menú." };
  } catch {
    return { ok: false, message: "No se pudo quitar la receta." };
  }
}
