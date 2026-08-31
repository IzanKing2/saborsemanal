"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast";
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
  const showToast = useToast();
  // Solo el texto de reserva sigue siendo inline: acompaña al cuadro que hay
  // que copiar a mano, así que tiene que quedarse en pantalla.
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function share() {
    setFallbackText(null);
    const text = formatShoppingListAsText(items, { title });

    try {
      if (navigator.share) {
        // Plain text (no url/files) is what lets the OS share sheet offer
        // apps like Notes/Google Keep as a target, turning the list
        // straight into a note there instead of just a file attachment.
        await navigator.share({ text, title });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast("✓ Lista copiada al portapapeles");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast(
        "No se pudo compartir automáticamente. Copia el texto de aquí abajo.",
        "error",
      );
      setFallbackText(text);
    }
  }

  async function exportAsText() {
    const text = formatShoppingListAsText(items, { title });
    const filename = `${slugify(title)}.txt`;

    // On phones, routing this through the native share sheet (when
    // supported) lets the user pick "Guardar en Archivos", Notes, Drive,
    // etc. -- a plain <a download> often just opens the file in a new tab
    // on mobile browsers instead of actually downloading/saving it.
    const file = new File([text], filename, { type: "text/plain" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Fall through to the plain download below.
      }
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
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
          onClick={() => void exportAsText()}
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
