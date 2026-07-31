"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next");
    if (requestedNext && !requestedNext.includes("\\")) {
      const parsedNext = new URL(requestedNext, window.location.origin);
      if (parsedNext.origin === window.location.origin) {
        setNextPath(
          `${parsedNext.pathname}${parsedNext.search}${parsedNext.hash}`,
        );
      }
    }
    if (params.get("error") === "auth")
      setError("El enlace de acceso no es válido o ha caducado.");
    if (params.get("reset") === "ok")
      setNotice("Contraseña actualizada. Inicia sesión con tu nueva clave.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("Introduce tu email y contraseña.");
    setPending(true);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(signInError.message.toLowerCase().includes("email not confirmed") ? "Confirma tu email antes de iniciar sesión." : "El email o la contraseña no son correctos.");
      setPending(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthShell eyebrow="Bienvenido de nuevo" title="Inicia sesión" description="Recupera tus recetas, tu menú y la lista de compra desde cualquier dispositivo.">
      {notice && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p>}
      {error && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <form className="space-y-5" noValidate onSubmit={submit}>
        <div><label className="text-sm font-bold text-stone-800" htmlFor="email">Email</label><input autoComplete="email" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div>
        <div><div className="flex items-center justify-between gap-4"><label className="text-sm font-bold text-stone-800" htmlFor="password">Contraseña</label><Link className="text-xs font-bold text-emerald-700 hover:underline" href="/forgot-password">¿La has olvidado?</Link></div><input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div>
        <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Entrando..." : "Entrar en mi cocina"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">¿Todavía no tienes cuenta? <Link className="font-bold text-emerald-700 hover:underline" href="/register">Créala gratis</Link></p>
    </AuthShell>
  );
}
