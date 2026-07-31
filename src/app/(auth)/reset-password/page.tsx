import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { verifyRecoveryToken } from "@/lib/recovery-token";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("saborsemanal-recovery")?.value;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!token || !user || !verifyRecoveryToken(token, user.id)) {
    redirect("/forgot-password");
  }
  return (
    <AuthShell eyebrow="Acceso recuperado" title="Elige una contraseña" description="Crea una clave nueva para proteger tu cuenta.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
