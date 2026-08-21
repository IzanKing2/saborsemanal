"use client";

import Link from "next/link";
import { useState } from "react";

import { startInviteSignupAction } from "@/lib/actions/grupo";

export function InvitationCardActions({
  invitationId,
  existingAccount,
}: {
  invitationId: string;
  existingAccount: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingAccount) {
    return (
      <Link
        className="mt-6 block w-full rounded-xl bg-emerald-700 px-5 py-3 text-center font-bold text-white hover:bg-emerald-800"
        href={`/login?next=${encodeURIComponent(`/invitacion/${invitationId}`)}`}
      >
        Iniciar sesión para aceptar
      </Link>
    );
  }

  async function startSignup() {
    setPending(true);
    setError(null);
    const result = await startInviteSignupAction(invitationId);
    if (!result.ok || !result.actionLink) {
      setError(result.message);
      setPending(false);
      return;
    }
    window.location.href = result.actionLink;
  }

  return (
    <>
      {error && (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        className="mt-6 w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        disabled={pending}
        onClick={() => void startSignup()}
        type="button"
      >
        {pending ? "Preparando..." : "Crear cuenta y unirme"}
      </button>
      <p className="mt-4 text-xs text-stone-500">
        ¿Ya tienes cuenta?{" "}
        <Link
          className="font-bold text-emerald-700 hover:underline"
          href={`/login?next=${encodeURIComponent(`/invitacion/${invitationId}`)}`}
        >
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
