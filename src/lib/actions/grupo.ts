"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

export type GroupActionState = {
  ok: boolean;
  message: string;
};

const initialErrorMessages: Record<string, string> = {
  P0002: "No existe ningún usuario con ese email.",
  "42501": "No tienes permisos para esta acción.",
  "22023": "No se pudo completar la operación. Revisa los datos.",
};

function mapError(code: string | undefined) {
  return (code && initialErrorMessages[code]) || "No se pudo completar la operación.";
}

export async function addGroupMemberAction(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { ok: false, message: "Introduce un email válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_group_member", { p_email: email });

  if (error) {
    return { ok: false, message: mapError(error.code) };
  }

  revalidatePath("/dashboard/grupo");
  return { ok: true, message: "Miembro añadido a tu grupo." };
}

export async function removeGroupMemberAction(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const targetId = String(formData.get("usuario_id") ?? "");
  if (!isUuid(targetId)) {
    return { ok: false, message: "Usuario no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_group_member", {
    p_target_id: targetId,
  });

  if (error) {
    return { ok: false, message: mapError(error.code) };
  }

  revalidatePath("/dashboard/grupo");
  return { ok: true, message: "Miembro eliminado del grupo." };
}
