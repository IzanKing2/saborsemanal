"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteGroupAction,
  removeGroupMemberAction,
  revokeGroupInvitationAction,
  type GroupActionState,
} from "@/lib/actions/grupo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InviteMemberForm } from "@/components/account/invite-member-form";

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
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function confirmDeleteGroup() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteGroupAction();
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.message);
      return;
    }
    setDeleteOpen(false);
    router.refresh();
  }

  async function confirmRemoveMember() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    const formData = new FormData();
    formData.set("usuario_id", removeTarget.usuario_id);
    const result = await removeGroupMemberAction(initialState, formData);
    setRemoving(false);
    if (!result.ok) {
      setRemoveError(result.message);
      return;
    }
    setRemoveTarget(null);
    router.refresh();
  }

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
                <button
                  className="text-xs font-bold text-red-700 hover:underline"
                  onClick={() => {
                    setRemoveError(null);
                    setRemoveTarget(member);
                  }}
                  type="button"
                >
                  Quitar
                </button>
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
            al entrar. Si no, puedes enviarle un email o compartir un enlace
            por WhatsApp para que cree su cuenta. La invitación caduca en 24
            horas.
          </p>
          <div className="mt-4">
            <InviteMemberForm idPrefix="grupo-panel" />
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-bold text-red-900">Zona peligrosa</h2>
          <p className="mt-1 text-sm text-red-800">
            Eliminar el grupo lo disuelve por completo: tú y el resto de
            miembros volveréis a tener cada uno vuestro propio grupo
            independiente. Esta acción no se puede deshacer.
          </p>
          {deleteError && (
            <p className="mt-2 text-xs font-semibold text-red-700">{deleteError}</p>
          )}
          <button
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            onClick={() => setDeleteOpen(true)}
            type="button"
          >
            Eliminar grupo
          </button>
        </section>
      )}

      <ConfirmDialog
        busy={deleting}
        confirmLabel="Sí, eliminar grupo"
        description={
          members.length > 1
            ? `Vas a eliminar el grupo. Los otros ${members.length - 1} miembro(s) dejarán de compartir menú, lista de la compra y recetas contigo: cada uno pasará a tener su propio grupo independiente. Esta acción no se puede deshacer.`
            : "Vas a eliminar el grupo. Como todavía no tienes a nadie más, esto solo te deja con un grupo nuevo y vacío. Esta acción no se puede deshacer."
        }
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDeleteGroup()}
        open={deleteOpen}
        title="¿Eliminar el grupo?"
        tone="danger"
      />

      <ConfirmDialog
        busy={removing}
        confirmLabel="Sí, quitar"
        description={`${removeTarget?.display_name ?? removeTarget?.email ?? "Esta persona"} dejará de compartir menú, lista de la compra y recetas contigo, y pasará a tener su propio grupo independiente.${
          removeError ? ` ${removeError}` : ""
        }`}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemoveMember()}
        open={removeTarget !== null}
        title="¿Quitar a esta persona del grupo?"
        tone="danger"
      />
    </div>
  );
}
