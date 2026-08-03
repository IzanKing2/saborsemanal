"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { parseMonday } from "@/lib/week";

export type ShoppingListActionResult = {
  ok: boolean;
  message: string;
};

export async function regenerateShoppingListAction(
  week: string,
): Promise<ShoppingListActionResult> {
  if (parseMonday(week) !== week) {
    return { ok: false, message: "La semana indicada no es válida." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("regenerate_shopping_list", {
      p_week: week,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para generar esta lista."
            : "No se pudo regenerar la lista.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return {
      ok: true,
      message:
        "Lista regenerada. Se conservaron los checks con cantidades sin cambios.",
    };
  } catch {
    return { ok: false, message: "No se pudo regenerar la lista." };
  }
}

export async function clearShoppingListAction(
  week: string,
): Promise<ShoppingListActionResult> {
  if (parseMonday(week) !== week) {
    return { ok: false, message: "La semana indicada no es válida." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("clear_shopping_list", {
      p_week: week,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para vaciar esta lista."
            : "No se pudo vaciar la lista.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return { ok: true, message: "Lista de la compra vaciada." };
  } catch {
    return { ok: false, message: "No se pudo vaciar la lista." };
  }
}

export async function setShoppingItemPurchasedAction(
  itemId: string,
  purchased: boolean,
): Promise<ShoppingListActionResult> {
  if (!isUuid(itemId) || typeof purchased !== "boolean") {
    return { ok: false, message: "El cambio indicado no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("set_shopping_item_purchased", {
      p_item_id: itemId,
      p_purchased: purchased,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para modificar este elemento."
            : "No se pudo guardar el cambio.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return { ok: true, message: "Lista actualizada." };
  } catch {
    return { ok: false, message: "No se pudo guardar el cambio." };
  }
}

export async function addRecipeToShoppingListAction(
  recipeId: string,
): Promise<ShoppingListActionResult> {
  if (!isUuid(recipeId)) {
    return { ok: false, message: "La receta indicada no es válida." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("add_recipe_to_shopping_list", {
      p_receta_id: recipeId,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para añadir esta receta."
            : "No se pudo añadir la receta a la lista.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return { ok: true, message: "Receta añadida a tu lista." };
  } catch {
    return { ok: false, message: "No se pudo añadir la receta a la lista." };
  }
}

export async function setExtraItemPurchasedAction(
  itemId: string,
  purchased: boolean,
): Promise<ShoppingListActionResult> {
  if (!isUuid(itemId) || typeof purchased !== "boolean") {
    return { ok: false, message: "El cambio indicado no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("set_extra_item_purchased", {
      p_item_id: itemId,
      p_purchased: purchased,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para modificar este elemento."
            : "No se pudo guardar el cambio.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return { ok: true, message: "Lista actualizada." };
  } catch {
    return { ok: false, message: "No se pudo guardar el cambio." };
  }
}

export async function removeExtraItemAction(
  itemId: string,
): Promise<ShoppingListActionResult> {
  if (!isUuid(itemId)) {
    return { ok: false, message: "El elemento indicado no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("remove_extra_item", {
      p_item_id: itemId,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para modificar este elemento."
            : "No se pudo retirar el elemento.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return { ok: true, message: "Elemento retirado de tu lista." };
  } catch {
    return { ok: false, message: "No se pudo retirar el elemento." };
  }
}

export async function removeShoppingItemAction(
  itemId: string,
): Promise<ShoppingListActionResult> {
  if (!isUuid(itemId)) {
    return { ok: false, message: "El elemento indicado no es válido." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };

    const { error } = await supabase.rpc("remove_shopping_item", {
      p_item_id: itemId,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para retirar este elemento."
            : "No se pudo retirar el elemento.",
      };
    }

    revalidatePath("/dashboard/lista-compra");
    return {
      ok: true,
      message: "Ingrediente retirado. Volverá si regeneras la lista.",
    };
  } catch {
    return { ok: false, message: "No se pudo retirar el elemento." };
  }
}
