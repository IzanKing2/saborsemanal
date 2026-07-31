"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  duplicateRecipeAction,
  type DuplicateRecipeState,
} from "@/lib/actions/recetas";

const initialState: DuplicateRecipeState = { ok: false, message: "" };

function CopyButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? "Guardando..." : "Guardar en mi recetario"}
    </button>
  );
}

export function CopyRecipeButton({ id }: { id: string }) {
  const [state, formAction] = useActionState(duplicateRecipeAction, initialState);

  return (
    <form action={formAction}>
      <input name="id" type="hidden" value={id} />
      <CopyButton />
      {state.message && !state.ok && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
