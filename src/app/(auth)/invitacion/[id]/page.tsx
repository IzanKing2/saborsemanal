import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitationCardActions } from "@/components/auth/invitation-card-actions";
import { logoutAction } from "@/lib/actions/cuenta";
import { acceptGroupInvitationAction } from "@/lib/actions/grupo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function Card({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ea] px-4 py-10 text-stone-900">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
        <div className="bg-emerald-950 px-8 py-7 text-center text-white">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
            {eyebrow}
          </p>
          <p className="mt-2 text-lg font-black">
            Sabor<span className="text-amber-300">Semanal</span>
          </p>
        </div>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-stone-950">{title}</h1>
          <p className="mt-3 leading-7 text-stone-600">{description}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export default async function InvitationCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: preview } = await supabase
    .rpc("get_invitation_preview", { p_invitation_id: id })
    .maybeSingle();

  if (!preview) {
    return (
      <Card
        description="Puede que el enlace esté mal copiado. Pide a quien te invitó que te comparta uno nuevo."
        eyebrow="Invitación"
        title="No encontramos esta invitación"
      />
    );
  }

  const expired = new Date(preview.expires_at) < new Date();
  if (preview.status !== "pending" || expired) {
    const reason =
      preview.status === "accepted"
        ? "Esta invitación ya se aceptó."
        : preview.status === "declined"
          ? "Esta invitación ya se rechazó."
          : expired
            ? "Esta invitación ha caducado."
            : "Esta invitación ya no está disponible.";
    return (
      <Card
        description={`${reason} Pide a quien te invitó que cree una invitación nueva si sigues interesado en unirte.`}
        eyebrow="Invitación"
        title="Ya no está disponible"
      />
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.email === preview.email) {
      const result = await acceptGroupInvitationAction(preview.id);
      if (result.ok) redirect("/dashboard/grupo?joined=1");
      return (
        <Card
          description={result.message}
          eyebrow="Invitación"
          title="No se pudo aceptar"
        >
          <Link
            className="mt-6 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
            href="/dashboard/grupo"
          >
            Ir a mi grupo
          </Link>
        </Card>
      );
    }

    return (
      <Card
        description={`Esta invitación es para ${preview.email}, pero has iniciado sesión con otra cuenta. Cierra sesión y vuelve a abrir este enlace con la cuenta correcta.`}
        eyebrow="Invitación"
        title="Cuenta distinta"
      >
        <form action={logoutAction}>
          <button
            className="mt-6 w-full rounded-xl border border-stone-300 px-5 py-3 font-bold text-stone-700 hover:bg-stone-50"
            type="submit"
          >
            Cerrar sesión
          </button>
        </form>
      </Card>
    );
  }

  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", preview.email)
    .maybeSingle();

  return (
    <Card
      description={`${preview.invited_by_nombre} te ha invitado a compartir menú semanal, lista de la compra y recetas en "${preview.grupo_nombre}".`}
      eyebrow="Te han invitado"
      title="Únete a un grupo en SaborSemanal"
    >
      <InvitationCardActions
        existingAccount={Boolean(existingProfile)}
        invitationId={preview.id}
      />
    </Card>
  );
}
