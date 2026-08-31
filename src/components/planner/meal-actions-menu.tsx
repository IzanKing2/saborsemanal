"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useMenuDismiss } from "@/lib/use-dialog-focus";

type MealActionsMenuProps = {
  anchor: HTMLElement | null;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

const MENU_WIDTH = 232;
const VIEWPORT_MARGIN = 8;

/**
 * Se dibuja en un portal porque el calendario de escritorio vive dentro de un
 * contenedor con scroll horizontal: un menú posicionado dentro de la columna se
 * recortaría. En móvil se convierte en hoja inferior, más cómoda con el pulgar.
 */
export function MealActionsMenu({
  anchor,
  title,
  onClose,
  children,
}: MealActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [isMobile, setIsMobile] = useState(false);

  useMenuDismiss(true, onClose);

  useLayoutEffect(() => {
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    setIsMobile(mobile);
    if (mobile || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? 280;
    const left = Math.min(
      Math.max(rect.right - MENU_WIDTH, VIEWPORT_MARGIN),
      window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
    );
    const opensUpward = rect.bottom + height + VIEWPORT_MARGIN > window.innerHeight;
    setPosition({
      top: opensUpward
        ? Math.max(rect.top - height - 6, VIEWPORT_MARGIN)
        : rect.bottom + 6,
      left,
    });
  }, [anchor]);

  useEffect(() => {
    const first = menuRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), a[href], input",
    );
    first?.focus();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[65]"
      onClick={onClose}
      onScroll={onClose}
      role="presentation"
    >
      <div
        aria-label={title}
        className={
          isMobile
            ? "absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-stone-200 bg-white p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl"
            : "absolute rounded-2xl border border-stone-200 bg-white p-1.5 shadow-2xl"
        }
        onClick={(event) => event.stopPropagation()}
        ref={menuRef}
        role="menu"
        style={
          isMobile
            ? undefined
            : {
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                width: MENU_WIDTH,
              }
        }
      >
        <p className="truncate px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          {title}
        </p>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function MealActionsItem({
  children,
  disabled = false,
  hint,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "text-red-700 hover:bg-red-50 active:bg-red-100"
          : "text-stone-700 hover:bg-emerald-50 active:bg-emerald-100"
      }`}
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span>{children}</span>
      {hint && <span className="text-xs font-medium text-stone-400">{hint}</span>}
    </button>
  );
}
