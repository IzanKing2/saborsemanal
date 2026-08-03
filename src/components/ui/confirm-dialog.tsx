"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  dismissible?: boolean;
  tone?: "danger" | "default";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy = false,
  dismissible = true,
  tone = "default",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy && dismissible) onCancel();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [busy, dismissible, onCancel, open]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700"
      : "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700";

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 py-6"
      onClick={() => {
        if (!busy && dismissible) onCancel();
      }}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-stone-200 bg-[#f6f3ea] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
          Confirmación
        </p>
        <h2 className="mt-2 text-2xl font-black text-stone-950">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-xl px-4 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${confirmClass}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
