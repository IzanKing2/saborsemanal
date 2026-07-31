"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  adminDeleteRecipeAction,
  type AdminDeleteRecipeState,
} from "@/lib/actions/admin-recetas";

const initialState: AdminDeleteRecipeState = { ok: false, message: "" };

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export function AdminDeleteRecipeForm({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [state, formAction] = useActionState(
    adminDeleteRecipeAction,
    initialState,
  );

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
