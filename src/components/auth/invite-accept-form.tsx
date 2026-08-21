"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { acceptGroupInvitationAction } from "@/lib/actions/grupo";
import { setPasswordAfterInviteAction } from "@/lib/actions/invitacion";
import { createClient } from "@/lib/supabase/client";

type Step = "confirming" | "invalid" | "password" | "done";

export function InviteAcceptForm() {
  const [step, setStep] = useState<Step>("confirming");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function confirm() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (hash.get("type") !== "invite" || !accessToken || !refreshToken) {
        setStep("invalid");
        return;
      }

      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError || !data.user) {
        setStep("invalid");
        return;
      }

      const invitationId = data.user.user_metadata?.pending_grupo_invitation_id;
      if (typeof invitationId === "string") {
        await acceptGroupInvitationAction(invitationId);
      }
      window.history.replaceState(null, "", window.location.pathname);
      setStep("password");
    }

    void confirm();
  }, []);

  async function submitPassword() {
    if (pending) return;
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("La contraseña necesita 8 caracteres, una mayúscula y un número.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await setPasswordAfterInviteAction(password);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }
    setStep("done");
    setPending(false);
  }

  if (step === "confirming") {
    return <p className="text-sm text-stone-600">Confirmando invitación...</p>;
  }

  if (step === "invalid") {
    return (
      <p
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        El enlace no es válido o ha caducado. Pide a quien te invitó que
        cree una invitación nueva.
      </p>
    );
  }

  if (step === "password") {
    return (
      <>
        <p className="text-sm leading-6 text-stone-600">
          ¡Ya formas parte del grupo! Elige una contraseña para poder entrar
          desde cualquier dispositivo.
        </p>
        {error && (
          <p
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-bold" htmlFor="invite-password">
              Contraseña
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
              id="invite-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="invite-password-confirm">
              Repite la contraseña
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"
              id="invite-password-confirm"
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              value={confirmation}
            />
          </div>
          <button
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={pending}
            onClick={() => void submitPassword()}
            type="button"
          >
            {pending ? "Guardando..." : "Guardar y entrar"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Todo listo. Ya puedes ver el menú y la lista de la compra de tu
        grupo.
      </p>
      <Link
        className="mt-6 block w-full rounded-xl bg-emerald-700 px-4 py-3 text-center font-bold text-white hover:bg-emerald-800"
        href="/dashboard/grupo"
      >
        Ir a mi grupo
      </Link>
    </>
  );
}
