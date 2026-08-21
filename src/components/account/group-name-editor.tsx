"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { renameGroupAction } from "@/lib/actions/grupo";

export function GroupNameEditor({
  nombre,
  isAdmin,
}: {
  nombre: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nombre);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
        {nombre}
      </h1>
    );
  }

  if (!editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          {nombre}
        </h1>
        <button
          className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:border-emerald-500 hover:text-white"
          onClick={() => {
            setValue(nombre);
            setError(null);
            setEditing(true);
          }}
          type="button"
        >
          Editar nombre
        </button>
      </div>
    );
  }

  async function save() {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("nombre", value);
    const result = await renameGroupAction({ ok: false, message: "" }, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-2 text-2xl font-black text-white outline-none focus:ring-2 focus:ring-amber-300"
          maxLength={60}
          minLength={2}
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
        <button
          className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-200 disabled:opacity-50"
          disabled={pending}
          onClick={() => void save()}
          type="button"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button
          className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-100 hover:text-white"
          disabled={pending}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}
    </div>
  );
}
