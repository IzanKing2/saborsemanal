"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  adminDeleteRecipeAction,
  type AdminDeleteRecipeState,
} from "@/lib/actions/admin-recetas";

const initialState: AdminDeleteRecipeState = { ok: false, message: "" };

function DeleteButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      onClick={onClick}
      type="button"
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form action={formAction} ref={formRef}>
        <input name="id" type="hidden" value={id} />
        <DeleteButton onClick={() => setConfirmOpen(true)} />
        {state.message && !state.ok && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {state.message}
          </p>
        )}
      </form>
      <ConfirmDialog
        confirmLabel="Eliminar receta"
        description={`La receta “${title}” se eliminará definitivamente del catálogo. Esta acción no se puede deshacer.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
        open={confirmOpen}
        title="¿Eliminar esta receta?"
        tone="danger"
      />
    </>
  );
}
