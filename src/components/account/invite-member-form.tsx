"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { inviteGroupMemberAction, type GroupActionState } from "@/lib/actions/grupo";

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

export function InviteMemberForm({ idPrefix }: { idPrefix: string }) {
  const [state, formAction] = useActionState(inviteGroupMemberAction, initialState);
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const lastOpenedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (state.whatsappUrl && state.whatsappUrl !== lastOpenedUrl.current) {
      lastOpenedUrl.current = state.whatsappUrl;
      window.open(state.whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }, [state.whatsappUrl]);

  return (
    <div>
      <div
        className="inline-flex rounded-lg border border-stone-300 bg-stone-50 p-1 text-xs font-bold"
        role="radiogroup"
      >
        <button
          aria-pressed={method === "email"}
          className={`rounded-md px-3 py-1.5 ${
            method === "email"
              ? "bg-white text-emerald-800 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
          onClick={() => setMethod("email")}
          type="button"
        >
          Email
        </button>
        <button
          aria-pressed={method === "whatsapp"}
          className={`rounded-md px-3 py-1.5 ${
            method === "whatsapp"
              ? "bg-white text-emerald-800 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
          onClick={() => setMethod("whatsapp")}
          type="button"
        >
          WhatsApp
        </button>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap gap-3">
        <input name="method" type="hidden" value={method} />
        <input
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          id={`${idPrefix}-email`}
          name="email"
          placeholder="email@ejemplo.com"
          required
          type="email"
        />
        <SubmitButton
          label={method === "whatsapp" ? "Generar enlace" : "Invitar"}
          pendingLabel={method === "whatsapp" ? "Generando..." : "Invitando..."}
        />
      </form>
      {method === "whatsapp" && (
        <p className="mt-2 text-xs text-stone-500">
          Necesitamos su email para vincular la invitación a su cuenta, aunque
          el enlace se comparta por WhatsApp.
        </p>
      )}
      {state.message && (
        <p className={`mt-2 text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
