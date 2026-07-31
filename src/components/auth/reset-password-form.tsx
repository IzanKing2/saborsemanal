"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { clearRecoveryMarkerAction } from "@/lib/actions/cuenta";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setError(
        "La contraseña necesita 8 caracteres, una mayúscula y un número.",
      );
    }
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError("El enlace ha caducado. Solicita uno nuevo.");
      setPending(false);
      return;
    }
    await clearRecoveryMarkerAction();
    router.push("/dashboard/cuenta");
    router.refresh();
  }

  return (
    <>
      {error && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <form className="space-y-5" onSubmit={submit}>
        <div><label className="text-sm font-bold" htmlFor="password">Nueva contraseña</label><input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div>
        <div><label className="text-sm font-bold" htmlFor="confirmation">Repite la contraseña</label><input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="confirmation" onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></div>
        <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Guardando..." : "Guardar contraseña"}</button>
      </form>
    </>
  );
}
