"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteRecipeAction,
  type DeleteRecipeState,
} from "@/lib/actions/recetas";

const initialState: DeleteRecipeState = { ok: false, message: "" };

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="text-sm font-bold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export function DeleteRecipeForm({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [state, formAction] = useActionState(deleteRecipeAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar definitivamente “${title}”?`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={id} />
      <DeleteButton />
      {state.message && !state.ok && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
