"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  inviteGroupMemberAction,
  removeGroupMemberAction,
  revokeGroupInvitationAction,
  type GroupActionState,
} from "@/lib/actions/grupo";

type Member = {
  usuario_id: string;
  email: string;
  display_name: string | null;
  rol: string;
  es_yo: boolean;
};

type Invitation = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
};

const initialState: GroupActionState = { ok: false, message: "" };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function RemoveMemberButton({ usuarioId }: { usuarioId: string }) {
  const [state, formAction] = useActionState(removeGroupMemberAction, initialState);
  return (
    <form action={formAction}>
      <input name="usuario_id" type="hidden" value={usuarioId} />
      <button
        className="text-xs font-bold text-red-700 hover:underline"
        type="submit"
      >
        Quitar
      </button>
      {state.message && !state.ok && (
        <p className="mt-1 text-xs text-red-600">{state.message}</p>
      )}
    </form>
  );
}

function hoursLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
}

function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  async function revoke() {
    await revokeGroupInvitationAction(invitationId);
  }
  return (
    <form action={revoke}>
      <button
        className="text-xs font-bold text-red-700 hover:underline"
        type="submit"
      >
        Revocar
      </button>
    </form>
  );
}

export function GroupMembersPanel({
  isAdmin,
  members,
  invitations,
}: {
  isAdmin: boolean;
  members: Member[];
  invitations: Invitation[];
}) {
  const [inviteState, inviteAction] = useActionState(
    inviteGroupMemberAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-950">Miembros</h2>
        <ul className="mt-4 divide-y divide-stone-100">
          {members.map((member) => (
            <li
              className="flex items-center justify-between gap-3 py-3"
              key={member.usuario_id}
            >
              <div>
                <p className="font-semibold text-stone-900">
                  {member.display_name ?? member.email}
                  {member.es_yo && (
                    <span className="ml-2 text-xs font-bold text-emerald-700">
                      (tú)
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  {member.email} ·{" "}
                  {member.rol === "admin" ? "Administrador" : "Miembro"}
                </p>
              </div>
              {isAdmin && !member.es_yo && (
                <RemoveMemberButton usuarioId={member.usuario_id} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && invitations.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-950">Invitaciones pendientes</h2>
          <ul className="mt-4 divide-y divide-stone-100">
            {invitations.map((invitation) => (
              <li
                className="flex items-center justify-between gap-3 py-3"
                key={invitation.id}
              >
                <div>
                  <p className="font-semibold text-stone-900">{invitation.email}</p>
                  <p className="text-xs text-stone-500">
                    Expira en {hoursLeft(invitation.expires_at)} h
                  </p>
                </div>
                <RevokeInvitationButton invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-950">Invitar a alguien</h2>
          <p className="mt-1 text-sm text-stone-600">
            Si ya tiene cuenta en SaborSemanal, verá la invitación pendiente
            al entrar. Si no, le llega un email para crear su cuenta y
            unirse directamente al grupo. La invitación caduca en 24 horas.
          </p>
          <form action={inviteAction} className="mt-4 flex flex-wrap gap-3">
            <input
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              name="email"
              placeholder="email@ejemplo.com"
              required
              type="email"
            />
            <SubmitButton label="Invitar" pendingLabel="Invitando..." />
          </form>
          {inviteState.message && (
            <p
              className={`mt-2 text-xs ${inviteState.ok ? "text-emerald-700" : "text-red-600"}`}
            >
              {inviteState.message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
