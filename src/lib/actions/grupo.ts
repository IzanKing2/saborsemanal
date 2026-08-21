"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/recipes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type GroupActionState = {
  ok: boolean;
  message: string;
  whatsappUrl?: string;
};

const initialErrorMessages: Record<string, string> = {
  "42501": "No tienes permisos para esta acción.",
  "22023": "No se pudo completar la operación. Revisa los datos.",
};

function mapError(code: string | undefined) {
  return (code && initialErrorMessages[code]) || "No se pudo completar la operación.";
}

async function siteOrigin() {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
  return `${protocol}://${host}`;
}

export async function renameGroupAction(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (nombre.length < 2 || nombre.length > 60) {
    return { ok: false, message: "El nombre debe tener entre 2 y 60 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ha caducado." };

  // Relies on the existing grupos_update_admin RLS policy (admin +
  // id = my_grupo_id()) -- no dedicated RPC needed for a plain rename.
  const { data: membership } = await supabase
    .from("grupo_miembros")
    .select("grupo_id")
    .eq("usuario_id", user.id)
    .eq("rol", "admin")
    .maybeSingle();
  if (!membership) {
    return { ok: false, message: "Solo el administrador del grupo puede renombrarlo." };
  }

  const { error } = await supabase
    .from("grupos")
    .update({ nombre })
    .eq("id", membership.grupo_id);

  if (error) {
    return { ok: false, message: "No se pudo guardar el nombre del grupo." };
  }

  revalidatePath("/dashboard/cuenta");
  revalidatePath("/dashboard/grupo");
  return { ok: true, message: "Nombre del grupo actualizado." };
}

function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function inviteGroupMemberAction(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const method = String(formData.get("method") ?? "email");
  if (!email) {
    return { ok: false, message: "Introduce un email válido." };
  }

  const supabase = await createClient();
  const { data: invitation, error } = await supabase.rpc(
    "create_group_invitation",
    { p_email: email },
  );

  if (error || !invitation) {
    return { ok: false, message: mapError(error?.code) };
  }

  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  revalidatePath("/dashboard/grupo");

  // Already has an account: no auth link needed -- their own email is
  // already verified, so they just see the pending invitation next time
  // they're in the app (accept/decline banner). The WhatsApp card page
  // itself (/invitacion/[id]) figures out on load whether the visitor is
  // already logged in as the invitee (auto-accepts) or needs to log in
  // first -- one shareable link works for both.
  if (existingProfile) {
    if (method === "whatsapp") {
      const text = `¡Te he invitado a mi grupo en SaborSemanal! 🍳 Abre tu invitación aquí: ${await siteOrigin()}/invitacion/${invitation.id}`;
      return {
        ok: true,
        message: "Tarjeta de invitación lista: compártela por WhatsApp.",
        whatsappUrl: whatsappShareUrl(text),
      };
    }
    return {
      ok: true,
      message:
        "Esa persona ya tiene cuenta: verá la invitación pendiente la próxima vez que entre en SaborSemanal.",
    };
  }

  if (method === "whatsapp") {
    // The actual Supabase magic link is generated on demand when they tap
    // "Crear cuenta" on the card page, not embedded in the WhatsApp
    // message itself -- keeps the shared link short and branded.
    const text = `¡Te he invitado a mi grupo en SaborSemanal! 🍳 Abre tu invitación aquí: ${await siteOrigin()}/invitacion/${invitation.id}`;
    return {
      ok: true,
      message: "Tarjeta de invitación lista: compártela por WhatsApp. Caduca en 24 horas.",
      whatsappUrl: whatsappShareUrl(text),
    };
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { pending_grupo_invitation_id: invitation.id },
      redirectTo: `${await siteOrigin()}/invitacion`,
    },
  );

  if (inviteError) {
    return {
      ok: false,
      message: "No se pudo enviar el email de invitación. Inténtalo de nuevo.",
    };
  }

  return {
    ok: true,
    message: "Invitación enviada por email. Caduca en 24 horas si no se acepta.",
  };
}

export type StartSignupResult = GroupActionState & { actionLink?: string };

// Called from the /invitacion/[id] card page when the visitor has no
// account yet: generates the real Supabase invite link on demand (rather
// than embedding it in the WhatsApp message at creation time) and hands
// it back so the client can navigate straight to it.
export async function startInviteSignupAction(
  invitationId: string,
): Promise<StartSignupResult> {
  if (!isUuid(invitationId)) {
    return { ok: false, message: "Invitación no válida." };
  }

  const supabase = await createClient();
  const { data: preview } = await supabase
    .rpc("get_invitation_preview", { p_invitation_id: invitationId })
    .maybeSingle();

  if (
    !preview ||
    preview.status !== "pending" ||
    new Date(preview.expires_at) < new Date()
  ) {
    return { ok: false, message: "Esta invitación ya no es válida." };
  }

  const admin = createAdminClient();
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: preview.email,
    options: {
      data: { pending_grupo_invitation_id: invitationId },
      redirectTo: `${await siteOrigin()}/invitacion`,
    },
  });

  if (error || !linkData.properties?.action_link) {
    return { ok: false, message: "No se pudo iniciar el registro. Inténtalo de nuevo." };
  }

  return { ok: true, message: "", actionLink: linkData.properties.action_link };
}

export async function acceptGroupInvitationAction(
  invitationId: string,
): Promise<GroupActionState> {
  if (!isUuid(invitationId)) {
    return { ok: false, message: "Invitación no válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_group_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { ok: false, message: mapError(error.code) };
  }

  revalidatePath("/dashboard/grupo");
  revalidatePath("/dashboard");
  return { ok: true, message: "Te has unido al grupo." };
}

export async function declineGroupInvitationAction(
  invitationId: string,
): Promise<GroupActionState> {
  if (!isUuid(invitationId)) {
    return { ok: false, message: "Invitación no válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_group_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { ok: false, message: mapError(error.code) };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Invitación rechazada." };
}

export async function revokeGroupInvitationAction(
  invitationId: string,
): Promise<GroupActionState> {
  if (!isUuid(invitationId)) {
    return { ok: false, message: "Invitación no válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_group_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { ok: false, message: mapError(error.code) };
  }

  revalidatePath("/dashboard/grupo");
  return { ok: true, message: "Invitación revocada." };
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

export async function deleteGroupAction(): Promise<GroupActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_group");

  if (error) {
    return { ok: false, message: mapError(error.code) };
  }

  revalidatePath("/dashboard/grupo");
  revalidatePath("/dashboard");
  return { ok: true, message: "Grupo eliminado. Cada miembro tiene ahora su propio grupo." };
}
