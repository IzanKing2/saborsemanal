"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  inviteGroupMemberAction,
  renameGroupAction,
  type GroupActionState,
} from "@/lib/actions/grupo";

const initialState: GroupActionState = { ok: false, message: "" };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function GroupSetupCard({
  groupName,
  isAlone,
}: {
  groupName: string;
  isAlone: boolean;
}) {
  const [renameState, renameAction] = useActionState(renameGroupAction, initialState);
  const [inviteState, inviteAction] = useActionState(inviteGroupMemberAction, initialState);

  if (!isAlone) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Familia
        </p>
        <h2 className="mt-2 text-xl font-black text-stone-950">{groupName}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Compartes menú, lista de la compra y recetas con tu grupo.
        </p>
        <Link
          className="mt-4 inline-block text-sm font-bold text-emerald-700 hover:underline"
          href="/dashboard/grupo"
        >
          Ver miembros e invitaciones →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
        Familia
      </p>
      <h2 className="mt-2 text-xl font-black text-stone-950">Crea tu grupo</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Comparte el menú semanal, la lista de la compra y las recetas con tu
        familia. Ponle un nombre e invita a quien quieras.
      </p>

      <form action={renameAction} className="mt-5 flex flex-wrap gap-3">
        <input
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          defaultValue={groupName === "Mi grupo" ? "" : groupName}
          maxLength={60}
          minLength={2}
          name="nombre"
          placeholder="Ej. Familia García"
          required
          type="text"
        />
        <SubmitButton label="Guardar nombre" pendingLabel="Guardando..." />
      </form>
      {renameState.message && (
        <p
          className={`mt-2 text-xs ${renameState.ok ? "text-emerald-700" : "text-red-600"}`}
        >
          {renameState.message}
        </p>
      )}

      <div className="mt-5 border-t border-stone-100 pt-5">
        <label className="text-sm font-bold text-stone-800" htmlFor="group-setup-invite">
          Invitar a alguien
        </label>
        <form action={inviteAction} className="mt-2 flex flex-wrap gap-3" id="group-setup-invite">
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
      </div>

      <Link
        className="mt-5 inline-block text-sm font-bold text-emerald-700 hover:underline"
        href="/dashboard/grupo"
      >
        Ver mi grupo →
      </Link>
    </div>
  );
}
