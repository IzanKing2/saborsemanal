"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Removing the focused node -- which is what closing a dialog does -- makes the
// browser drop focus onto <body>, and that lands after our cleanup runs. So hand
// focus back a frame later, and only if nothing else has claimed it since.
function restoreFocus(target: HTMLElement | null) {
  if (!target) return;
  requestAnimationFrame(() => {
    if (!target.isConnected) return;
    const active = document.activeElement;
    if (active === null || active === document.body) target.focus();
  });
}

function visibleFocusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed",
  );
}

// `aria-modal` tells a screen reader the rest of the page is inert, but it does
// nothing for the Tab key: without a trap, tabbing walks straight out of the
// dialog and into the content behind it. These two hooks add the keyboard half
// -- moving focus in, keeping it in, and handing it back on close.
//
// Both keep `onClose` in a ref rather than in the dependency array on purpose:
// callers pass inline arrows, so a dependency would re-run the effect on every
// render and yank focus back to the first control mid-typing.

/**
 * Full modal behaviour: focus enters the dialog, Tab and Shift+Tab cycle within
 * it, Escape closes, and focus returns to whatever opened it.
 * Attach the returned ref to the element carrying `role="dialog"`.
 */
export function useDialogFocus<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Captured during render, not in the effect: a child with `autoFocus` is
  // focused while React commits, so by the time effects run
  // `document.activeElement` is already inside the dialog and the real trigger
  // is lost. Rendering happens before that commit, so the trigger is still there.
  if (open && !restoreRef.current && typeof document !== "undefined") {
    restoreRef.current = document.activeElement as HTMLElement | null;
  }

  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const dialog = node;

    // Refresh it on reopen, but only ever with a candidate outside the dialog --
    // anything inside is our own doing, not the control the user came from.
    const active = document.activeElement as HTMLElement | null;
    if (active && !dialog.contains(active)) {
      restoreRef.current = active;
    }

    const first = visibleFocusables(dialog)[0];
    if (first) {
      first.focus();
    } else {
      // Nothing focusable inside: focus the dialog itself so the reader lands
      // in it instead of staying on <body>.
      dialog.tabIndex = -1;
      dialog.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = visibleFocusables(dialog);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      const escaped = !active || !dialog.contains(active);

      if (event.shiftKey && (escaped || active === firstItem)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (escaped || active === lastItem)) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocus(restoreRef.current);
    };
  }, [open]);

  return ref;
}

/**
 * Dropdown menu behaviour: Escape closes and focus returns to the trigger.
 * A menu leaves the page behind it usable, so it deliberately does not trap.
 */
export function useMenuDismiss(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const restoreTo = document.activeElement as HTMLElement | null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocus(restoreTo);
    };
  }, [open]);
}
