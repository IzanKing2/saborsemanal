"use client";

import Link from "next/link";
import { useState } from "react";

import { exchangeRecoveryTokenAction } from "@/lib/actions/cuenta";

export function RecoveryTokenForm({
  tokenHash,
  type,
}: {
  tokenHash: string | null;
  type: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tokenHash || type !== "recovery") {
    return (
      <div>
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          El enlace no es válido o ha caducado.
        </p>
        <p className="mt-4 text-sm">
          <Link
            className="font-bold text-emerald-700 hover:underline"
            href="/forgot-password"
          >
            Solicita uno nuevo
          </Link>
        </p>
      </div>
    );
  }

  const hash = tokenHash;

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await exchangeRecoveryTokenAction(hash);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }
    window.location.replace("/reset-password");
  }

  return (
    <>
      <p className="text-sm leading-6 text-stone-600">
        Pulsa el botón para confirmar que quieres restablecer tu contraseña. El
        enlace es de un solo uso y expira en 10 minutos.
      </p>
      {error && (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}{" "}
          <Link
            className="font-bold underline"
            href="/forgot-password"
          >
            Solicita uno nuevo.
          </Link>
        </p>
      )}
      <button
        className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        disabled={pending}
        onClick={submit}
        type="button"
      >
        {pending ? "Verificando..." : "Restablecer contraseña"}
      </button>
    </>
  );
}
