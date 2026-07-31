import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { maskEmail, verifyRecoveryToken } from "@/lib/recovery-token";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("saborsemanal-recovery")?.value;
  const recovery = token ? verifyRecoveryToken(token) : null;
  if (!recovery) {
    redirect("/forgot-password");
  }
  return (
    <AuthShell
      eyebrow="Acceso recuperado"
      title="Elige una contraseña"
      description={`Se restablecerá la contraseña de la cuenta ${maskEmail(recovery.email)}.`}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
