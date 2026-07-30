"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  moderateRecipeAction,
  type ModerationState,
} from "@/lib/actions/moderacion";

const initialState: ModerationState = { ok: false, message: "" };

function ModerationButton({
  decision,
}: {
  decision: "approve" | "reject";
}) {
  const { pending } = useFormStatus();
  const isApproval = decision === "approve";

  return (
    <button
      className={
        isApproval
          ? "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          : "rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
      }
      disabled={pending}
      name="decision"
      type="submit"
      value={decision}
    >
      {pending ? "Procesando..." : isApproval ? "Aprobar" : "Devolver"}
    </button>
  );
}

export function ModerationControls({ recipeId }: { recipeId: string }) {
  const [state, formAction] = useActionState(
    moderateRecipeAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input name="id" type="hidden" value={recipeId} />
      <div className="flex flex-wrap gap-2">
        <ModerationButton decision="approve" />
        <ModerationButton decision="reject" />
      </div>
      {state.message && (
        <p
          className={`mt-2 text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
