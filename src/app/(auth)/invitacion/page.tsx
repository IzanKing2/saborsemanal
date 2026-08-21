import { AuthShell } from "@/components/auth/auth-shell";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";

// No searchParams here: admin.inviteUserByEmail's confirmation link uses
// Supabase's classic implicit-flow verify redirect, which lands here with
// the session tokens in the URL *hash* fragment (#access_token=...), never
// sent to the server. InviteAcceptForm reads it client-side.
export default function InvitacionPage() {
  return (
    <AuthShell
      description="Confirma la invitación para unirte a su grupo en SaborSemanal: menú semanal, lista de la compra y recetas compartidas."
      eyebrow="Te han invitado"
      title="Únete a un grupo"
    >
      <InviteAcceptForm />
    </AuthShell>
  );
}
