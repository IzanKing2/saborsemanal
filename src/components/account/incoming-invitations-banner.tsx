"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  acceptGroupInvitationAction,
  declineGroupInvitationAction,
} from "@/lib/actions/grupo";

type Invitation = {
  id: string;
  grupo_nombre: string;
  invited_by_nombre: string;
  expires_at: string;
};

function hoursLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
}

export function IncomingInvitationsBanner({
  invitations,
}: {
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(id: string, accept: boolean) {
    setPendingId(id);
    setError(null);
    const result = accept
      ? await acceptGroupInvitationAction(id)
      : await declineGroupInvitationAction(id);
    setPendingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  if (invitations.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      {invitations.map((invitation) => (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"
          key={invitation.id}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
              Invitación a un grupo
            </p>
            <p className="mt-1 font-semibold text-stone-900">
              {invitation.invited_by_nombre} te ha invitado a{" "}
              {invitation.grupo_nombre}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              Expira en {hoursLeft(invitation.expires_at)} h
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pendingId === invitation.id}
              onClick={() => void respond(invitation.id, true)}
              type="button"
            >
              Aceptar
            </button>
            <button
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pendingId === invitation.id}
              onClick={() => void respond(invitation.id, false)}
              type="button"
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
      {error && (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
