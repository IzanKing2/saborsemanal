"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const name = displayName.trim();
    if (name.length < 2 || name.length > 60) return setMessage({ ok: false, text: "El nombre debe tener entre 2 y 60 caracteres." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMessage({ ok: false, text: "Introduce un email válido." });
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) return setMessage({ ok: false, text: "La contraseña necesita 8 caracteres, una mayúscula y un número." });
    if (password !== confirmation) return setMessage({ ok: false, text: "Las contraseñas no coinciden." });
    setPending(true);
    const { error } = await createClient().auth.signUp({ email: email.trim(), password, options: { data: { display_name: name } } });
    setMessage(error ? { ok: false, text: "No se pudo crear la cuenta. Revisa los datos." } : { ok: true, text: "Revisa tu email para confirmar la cuenta." });
    setPending(false);
  }

  return (
    <AuthShell eyebrow="Tu cocina, a tu manera" title="Crea tu cuenta" description="Guarda recetas propias, planifica cada semana y adapta el catálogo a tus necesidades.">
      {message && <p className={`mb-5 rounded-xl border px-4 py-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>}
      <form className="space-y-4" noValidate onSubmit={submit}>
        <div><label className="text-sm font-bold" htmlFor="display-name">Nombre visible</label><input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="display-name" maxLength={60} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></div>
        <div><label className="text-sm font-bold" htmlFor="email">Email</label><input autoComplete="email" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div>
        <div><label className="text-sm font-bold" htmlFor="password">Contraseña</label><input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div>
        <div><label className="text-sm font-bold" htmlFor="confirmation">Repite la contraseña</label><input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="confirmation" onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></div>
        <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Creando cuenta..." : "Crear mi cuenta"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">¿Ya tienes cuenta? <Link className="font-bold text-emerald-700 hover:underline" href="/login">Inicia sesión</Link></p>
    </AuthShell>
  );
}
