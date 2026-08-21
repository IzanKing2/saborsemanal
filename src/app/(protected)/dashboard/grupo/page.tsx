import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupMembersPanel } from "@/components/account/group-members-panel";
import { GroupNameEditor } from "@/components/account/group-name-editor";
import { createClient } from "@/lib/supabase/server";

export default async function GroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: grupo, error: grupoError },
    { data: miembros, error: miembrosError },
  ] = await Promise.all([
    supabase.from("grupos").select("id, nombre").maybeSingle(),
    supabase.rpc("list_group_members"),
  ]);

  if (grupoError || miembrosError) {
    throw new Error(
      `No se pudo cargar el grupo: ${(grupoError ?? miembrosError)?.message}`,
    );
  }

  const isAdmin = (miembros ?? []).some((m) => m.es_yo && m.rol === "admin");

  const { data: invitaciones, error: invitacionesError } = isAdmin
    ? await supabase.rpc("list_group_invitations")
    : { data: [], error: null };
  if (invitacionesError) {
    throw new Error(`No se pudieron cargar las invitaciones: ${invitacionesError.message}`);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="border-b border-emerald-900/10 bg-emerald-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href="/dashboard"
          >
            ← Panel
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Grupo familiar
          </p>
          <GroupNameEditor isAdmin={isAdmin} nombre={grupo?.nombre ?? "Mi grupo"} />
          <p className="mt-3 max-w-2xl text-emerald-100">
            Todos los miembros comparten el mismo menú semanal y la misma
            lista de la compra.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <GroupMembersPanel
          invitations={invitaciones ?? []}
          isAdmin={isAdmin}
          members={miembros ?? []}
        />
      </div>
    </main>
  );
}
