import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { verifyRecoveryToken } from "@/lib/recovery-token";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("saborsemanal-recovery")?.value;
  if (!token || !verifyRecoveryToken(token)) {
    redirect("/forgot-password");
  }
  return (
    <AuthShell eyebrow="Acceso recuperado" title="Elige una contraseña" description="Crea una clave nueva para proteger tu cuenta.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
