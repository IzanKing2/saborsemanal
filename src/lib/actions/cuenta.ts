"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/recipes";
import { createRecoveryToken, verifyRecoveryToken } from "@/lib/recovery-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AccountActionResult = {
  ok: boolean;
  message: string;
};

export async function updateProfileAction(input: {
  displayName: string;
  avatarPath: string | null;
  allergenIds: string[];
}): Promise<AccountActionResult> {
  const displayName = input.displayName.trim();
  const allergenIds = [...new Set(input.allergenIds)];
  if (
    displayName.length < 2 ||
    displayName.length > 60 ||
    allergenIds.length > 20 ||
    allergenIds.some((id) => !isUuid(id))
  ) {
    return { ok: false, message: "Los datos del perfil no son válidos." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Tu sesión ha caducado." };
    if (
      input.avatarPath &&
      (!input.avatarPath.startsWith(`${user.id}/`) ||
        input.avatarPath.length > 300)
    ) {
      return { ok: false, message: "La imagen de perfil no es válida." };
    }

    const { error } = await supabase.rpc("update_my_profile", {
      p_display_name: displayName,
      p_avatar_path: input.avatarPath ?? "",
      p_allergen_ids: allergenIds,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "No tienes permiso para modificar este perfil."
            : "No se pudo guardar el perfil.",
      };
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/cuenta");
    revalidatePath("/recetas");
    return { ok: true, message: "Perfil actualizado." };
  } catch {
    return { ok: false, message: "No se pudo guardar el perfil." };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function listAllStorageFiles(
  bucket: "profile-avatars" | "recipe-images",
  path: string,
) {
  const admin = createAdminClient();
  const files: { name: string; id: string | null }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(path, { limit: 100, offset });
    if (error) throw error;
    files.push(...(data ?? []));
    if (!data || data.length < 100) break;
    offset += data.length;
  }
  return files;
}

async function removeUserStorage(userId: string) {
  const admin = createAdminClient();
  const avatars = await listAllStorageFiles("profile-avatars", userId);
  if (avatars.length > 0) {
    const { error } = await admin.storage
      .from("profile-avatars")
      .remove(avatars.map((file) => `${userId}/${file.name}`));
    if (error) throw error;
  }

  const recipeEntries = await listAllStorageFiles("recipe-images", userId);
  for (const entry of recipeEntries) {
    if (entry.id) {
      const { error } = await admin.storage
        .from("recipe-images")
        .remove([`${userId}/${entry.name}`]);
      if (error) throw error;
      continue;
    }
    const files = await listAllStorageFiles(
      "recipe-images",
      `${userId}/${entry.name}`,
    );
    if (files.length > 0) {
      const { error } = await admin.storage
        .from("recipe-images")
        .remove(files.map((file) => `${userId}/${entry.name}/${file.name}`));
      if (error) throw error;
    }
  }
}

export async function deleteAccountAction(
  password: string,
  confirmation: string,
): Promise<AccountActionResult> {
  if (!password || confirmation !== "ELIMINAR") {
    return { ok: false, message: "La confirmación no es válida." };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, message: "Tu sesión ha caducado." };
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (authError) return { ok: false, message: "La contraseña no es correcta." };

    const admin = createAdminClient();
    const { error: markError } = await admin
      .from("profiles")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", user.id);
    if (markError) throw markError;

    await removeUserStorage(user.id);
    const { error } = await admin.rpc("delete_user_account", {
      p_user_id: user.id,
    });
    if (error) throw error;
    await supabase.auth.signOut();
    return { ok: true, message: "Cuenta eliminada." };
  } catch {
    return {
      ok: false,
      message:
        "La eliminación quedó pendiente. Puedes reintentarlo de forma segura o contactar con soporte.",
    };
  }
}

async function storeRecoveryCookie(userId: string, email: string) {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.set(cookie.name, "", {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
    }
  }
  cookieStore.set(
    "saborsemanal-recovery",
    createRecoveryToken(userId, email),
    {
      httpOnly: true,
      maxAge: 600,
      path: "/reset-password",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function exchangeRecoveryTokenAction(
  token_hash: string,
): Promise<AccountActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "recovery",
    });
    if (error || !data.user?.id || !data.user.email) {
      return {
        ok: false,
        message: "El enlace ha caducado o no es válido. Solicita uno nuevo.",
      };
    }

    await supabase.auth.signOut();

    await storeRecoveryCookie(data.user.id, data.user.email);
    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "El enlace ha caducado o no es válido. Solicita uno nuevo.",
    };
  }
}

export async function exchangeRecoveryCodeAction(
  code: string,
): Promise<AccountActionResult> {
  if (!code || code.length > 2_000) {
    return {
      ok: false,
      message: "El enlace ha caducado o no es válido. Solicita uno nuevo.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.id || !data.user.email) {
      return {
        ok: false,
        message: "El enlace ha caducado o no es válido. Solicita uno nuevo.",
      };
    }

    await supabase.auth.signOut();
    await storeRecoveryCookie(data.user.id, data.user.email);
    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "El enlace ha caducado o no es válido. Solicita uno nuevo.",
    };
  }
}

export async function resetPasswordAction(
  password: string,
): Promise<AccountActionResult> {
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

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("saborsemanal-recovery")?.value;
    const recovery = token ? verifyRecoveryToken(token) : null;
    if (!recovery) {
      return { ok: false, message: "El enlace ha caducado. Solicita uno nuevo." };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(recovery.userId, {
      password,
    });
    if (error) {
      return {
        ok: false,
        message:
          "No se pudo guardar la contraseña. Solicita un nuevo enlace de recuperación.",
      };
    }

    cookieStore.set("saborsemanal-recovery", "", {
      expires: new Date(0),
      httpOnly: true,
      path: "/reset-password",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return { ok: true, message: "Contraseña actualizada." };
  } catch {
    return { ok: false, message: "No se pudo guardar la contraseña." };
  }
}
