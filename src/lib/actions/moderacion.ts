"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

export type ModerationState = {
  ok: boolean;
  message: string;
};

export async function moderateRecipeAction(
  _previousState: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const idValue = formData.get("id");
  const decisionValue = formData.get("decision");
  const id = typeof idValue === "string" ? idValue : "";
  const decision = typeof decisionValue === "string" ? decisionValue : "";

  if (!isUuid(id) || !["approve", "reject"].includes(decision)) {
    return { ok: false, message: "La solicitud de moderación no es válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ha caducado." };

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || !isAdmin) {
    return { ok: false, message: "No tienes permisos de moderación." };
  }

  const { error } = await supabase.rpc("moderate_recipe", {
    p_id: id,
    p_decision: decision,
  });
  if (error) {
    return {
      ok: false,
      message:
        error.code === "P0002"
          ? "La receta ya no está pendiente."
          : "No se pudo moderar la receta.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/recetas");
  revalidatePath("/dashboard/recetas");
  revalidatePath("/recetas");
  revalidatePath(`/recetas/${id}`);

  return {
    ok: true,
    message: decision === "approve" ? "Receta aprobada." : "Receta devuelta.",
  };
}
