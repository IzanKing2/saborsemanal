"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

export type FavoriteActionResult = {
  ok: boolean;
  favorited: boolean;
  message: string;
};

export async function toggleFavoriteAction(
  recipeId: string,
): Promise<FavoriteActionResult> {
  if (!isUuid(recipeId)) {
    return { ok: false, favorited: false, message: "La receta indicada no es válida." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, favorited: false, message: "Tu sesión ha caducado." };
    }

    const { data, error } = await supabase.rpc("toggle_favorite", {
      p_receta_id: recipeId,
    });
    if (error) {
      return {
        ok: false,
        favorited: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para modificar tus favoritas."
            : "No se pudo actualizar el favorito.",
      };
    }

    revalidatePath("/dashboard/favoritas");
    revalidatePath("/recetas");
    return {
      ok: true,
      favorited: Boolean(data),
      message: data ? "Añadida a favoritas." : "Quitada de favoritas.",
    };
  } catch {
    return { ok: false, favorited: false, message: "No se pudo actualizar el favorito." };
  }
}
