"use server";

import { createClient } from "@/lib/supabase/server";

export type InviteActionResult = {
  ok: boolean;
  message: string;
};

export async function setPasswordAfterInviteAction(
  password: string,
): Promise<InviteActionResult> {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return {
      ok: false,
      message: "La contraseña necesita 8 caracteres, una mayúscula y un número.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Tu sesión ha caducado. Pide que te inviten de nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: "No se pudo guardar la contraseña." };
  }

  return { ok: true, message: "Contraseña guardada." };
}
