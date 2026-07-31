"use client";

import { FormEvent, useState } from "react";

import { deleteAccountAction } from "@/lib/actions/cuenta";

export function BlockedAccountDeletion() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await deleteAccountAction(password, confirmation);
    if (result.ok) window.location.assign("/");
    else setMessage(result.message);
    setPending(false);
  }
  return (
    <details className="mt-7 border-t border-stone-200 pt-6 text-left">
      <summary className="cursor-pointer text-center text-sm font-bold text-red-700">Eliminar mi cuenta</summary>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        {message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p>}
        <div><label className="text-sm font-bold" htmlFor="blocked-delete-password">Contraseña</label><input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="blocked-delete-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div>
        <div><label className="text-sm font-bold" htmlFor="blocked-delete-confirmation">Escribe ELIMINAR</label><input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="blocked-delete-confirmation" onChange={(event) => setConfirmation(event.target.value)} required value={confirmation} /></div>
        <button className="w-full rounded-xl bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={pending || confirmation !== "ELIMINAR"} type="submit">{pending ? "Eliminando..." : "Eliminar definitivamente"}</button>
      </form>
    </details>
  );
}
