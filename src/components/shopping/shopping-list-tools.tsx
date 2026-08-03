"use client";

import { useState } from "react";

export function ShoppingListTools() {
  const [message, setMessage] = useState<string | null>(null);

  async function share() {
    const payload = {
      title: "Lista de la compra | SaborSemanal",
      text: "Aquí tienes mi lista de la compra de SaborSemanal.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(payload.url);
      setMessage("Enlace copiado al portapapeles.");
    } catch {
      setMessage("No se pudo compartir la lista.");
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
        onClick={() => window.print()}
        type="button"
      >
        Imprimir
      </button>
      <button
        className="rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
        onClick={() => void share()}
        type="button"
      >
        Compartir
      </button>
      {message && <span className="text-xs font-semibold text-emerald-800">{message}</span>}
    </div>
  );
}
