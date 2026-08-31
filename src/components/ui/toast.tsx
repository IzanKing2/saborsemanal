"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastTone = "ok" | "error" | "pending";

type ToastState = { id: number; text: string; tone: ToastTone } | null;

export type ShowToast = (text: string, tone?: ToastTone) => void;

const DEFAULT_TIMEOUT_MS = 2600;

const ToastContext = createContext<ShowToast | null>(null);

/**
 * Avisos breves para acciones que ya se han guardado. Hay un único proveedor en
 * el layout y una sola ventana flotante: así una lista con veinte botones no
 * monta veinte portales, y el aviso nunca empuja el contenido (posición fija),
 * que es justo lo que hacía saltar las listas al marcar un elemento.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback<ShowToast>((text, tone = "ok") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;

    const id = ++nextId.current;
    setToast({ id, text, tone });
    // "Guardando..." no se descarta solo: lo sustituye el resultado.
    if (tone !== "pending") {
      timerRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, DEFAULT_TIMEOUT_MS);
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastViewport toast={toast} />
    </ToastContext.Provider>
  );
}

/**
 * Devuelve la función para lanzar avisos. Fuera del proveedor no falla: se
 * queda en un no-op, para que un componente pueda usarse aislado (tests,
 * historias, una página sin layout) sin romperse.
 */
export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  const fallback = useCallback<ShowToast>(() => {}, []);
  return showToast ?? fallback;
}

function ToastViewport({ toast }: { toast: ToastState }) {
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
        className={`max-w-[90vw] truncate rounded-full border px-4 py-2 text-sm font-semibold shadow-lg transition-opacity duration-150 sm:max-w-md ${toneClass} ${
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
