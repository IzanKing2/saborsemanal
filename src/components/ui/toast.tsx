"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ToastTone = "ok" | "error" | "pending";

export type ToastState = { id: number; text: string; tone: ToastTone } | null;

const DEFAULT_TIMEOUT_MS = 2600;

/**
 * Avisos breves para acciones que se guardan solas. Van en un portal y en
 * posición fija: nunca empujan el contenido, así que el calendario no salta
 * cada vez que se guarda un cambio.
 */
export function useToast(timeout = DEFAULT_TIMEOUT_MS) {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const showToast = useCallback(
    (text: string, tone: ToastTone = "ok") => {
      clearTimer();
      const id = ++nextId.current;
      setToast({ id, text, tone });
      // "Guardando..." no se descarta solo: lo sustituye el resultado.
      if (tone !== "pending") {
        timerRef.current = setTimeout(() => {
          setToast((current) => (current?.id === id ? null : current));
        }, timeout);
      }
    },
    [clearTimer, timeout],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const toneClass =
    toast?.tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : toast?.tone === "pending"
        ? "border-stone-200 bg-white text-stone-600"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return createPortal(
    <div
      // Por encima de la navegación inferior en móvil y pegado a la esquina en
      // escritorio. `pointer-events-none` para no tapar nada que haya debajo.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end"
    >
      <p
        aria-live="polite"
        className={`rounded-full border px-4 py-2 text-sm font-semibold shadow-lg transition-opacity duration-150 ${toneClass} ${
          toast ? "opacity-100" : "opacity-0"
        }`}
        role="status"
      >
        {toast?.text ?? ""}
      </p>
    </div>,
    document.body,
  );
}
