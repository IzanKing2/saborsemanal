"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setMessage(error ? { ok: false, text: "No se pudo enviar el enlace." } : { ok: true, text: "Si el email existe, recibirás un enlace para crear una nueva contraseña." });
    setPending(false);
  }
  return (
    <AuthShell eyebrow="Recupera el acceso" title="Nueva contraseña" description="Te enviaremos un enlace seguro para volver a entrar en tu cocina.">
      {message && <p className={`mb-5 rounded-xl border px-4 py-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>}
      <form className="space-y-5" onSubmit={submit}><div><label className="text-sm font-bold" htmlFor="email">Email de tu cuenta</label><input autoComplete="email" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div><button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Enviando..." : "Enviar enlace"}</button></form>
      <p className="mt-6 text-center text-sm"><Link className="font-bold text-emerald-700 hover:underline" href="/login">Volver al inicio de sesión</Link></p>
    </AuthShell>
  );
}
