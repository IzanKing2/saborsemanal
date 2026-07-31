import { AuthShell } from "@/components/auth/auth-shell";
import { RecoveryTokenForm } from "@/components/auth/recovery-token-form";

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      eyebrow="Recupera el acceso"
      title="Restablecer contraseña"
      description="Confirma que quieres crear una nueva contraseña para tu cuenta."
    >
      <RecoveryTokenForm
        tokenHash={params.token_hash ?? null}
        type={params.type ?? null}
      />
    </AuthShell>
  );
}
