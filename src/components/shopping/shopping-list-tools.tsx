"use client";

import { useState } from "react";

import { formatShoppingListAsText, type ShoppingListItem } from "@/lib/shopping-list";

function slugify(value: string) {
  return (
    value
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "lista-de-la-compra"
  );
}

export function ShoppingListTools({
  items,
  title = "Lista de la compra",
}: {
  items: ShoppingListItem[];
  title?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function share() {
    setMessage(null);
    setFallbackText(null);
    const text = formatShoppingListAsText(items, { title });

    try {
      if (navigator.share) {
        await navigator.share({ text, title });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage("Lista copiada al portapapeles.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("No se pudo compartir automáticamente. Copia el texto de aquí abajo:");
      setFallbackText(text);
    }
  }

  function exportAsText() {
    const text = formatShoppingListAsText(items, { title });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${slugify(title)}.txt`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
          onClick={() => window.print()}
          type="button"
        >
          Imprimir
        </button>
        <button
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
          onClick={exportAsText}
          type="button"
        >
          Exportar (.txt)
        </button>
        <button
          className="rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
          onClick={() => void share()}
          type="button"
        >
          Compartir
        </button>
        {message && (
          <span className="text-xs font-semibold text-emerald-800">{message}</span>
        )}
      </div>
      {fallbackText && (
        <textarea
          className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          rows={6}
          value={fallbackText}
        />
      )}
    </div>
  );
}
