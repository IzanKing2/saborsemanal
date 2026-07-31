"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminDeleteRecipeState = {
  ok: boolean;
  message: string;
};

export async function adminDeleteRecipeAction(
  _previousState: AdminDeleteRecipeState,
  formData: FormData,
): Promise<AdminDeleteRecipeState> {
  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue.trim() : "";
  if (!isUuid(id)) {
    return { ok: false, message: "La receta no es válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ha caducado." };

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || !isAdmin) {
    return { ok: false, message: "No tienes permisos de administración." };
  }

  const admin = createAdminClient();
  const { data: recipe, error: readError } = await admin
    .from("recetas")
    .select("id, imagen_url")
    .eq("id", id)
    .maybeSingle();
  if (readError || !recipe) {
    return { ok: false, message: "La receta ya no existe." };
  }

  const { error: deleteError } = await admin
    .from("recetas")
    .delete()
    .eq("id", id);
  if (deleteError) {
    return { ok: false, message: "No se pudo eliminar la receta." };
  }

  if (recipe.imagen_url) {
    const { error: storageError } = await admin.storage
      .from("recipe-images")
      .remove([recipe.imagen_url]);
    if (storageError) {
      console.error("Failed to remove image for deleted recipe", {
        recipeId: id,
        path: recipe.imagen_url,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/recetas");
  revalidatePath("/dashboard/recetas");
  revalidatePath("/recetas");
  revalidatePath(`/recetas/${id}`);

  return { ok: true, message: "Receta eliminada." };
}
