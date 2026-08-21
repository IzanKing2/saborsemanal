"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  WHATS_NEW_ITEMS,
  WHATS_NEW_TITLE,
  WHATS_NEW_VERSION,
} from "@/lib/whats-new";

const STORAGE_KEY = "saborsemanal:whats-new-seen";

export function WhatsNewPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== WHATS_NEW_VERSION) setOpen(true);
    } catch {
      // Storage unavailable (private browsing, etc.) -- just skip it
      // rather than show the popup on every visit.
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    } catch {
      // Nothing to persist to; the popup will just show again next visit.
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
      onClick={dismiss}
      role="presentation"
    >
      <section
        aria-labelledby="whats-new-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="bg-emerald-950 px-6 py-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            La web se ha actualizado
          </p>
          <h2 className="mt-1 text-xl font-black" id="whats-new-title">
            {WHATS_NEW_TITLE}
          </h2>
        </div>
        <div className="px-6 py-5">
          <ul className="space-y-3">
            {WHATS_NEW_ITEMS.map((item) => (
              <li className="flex gap-3 text-sm leading-6 text-stone-700" key={item}>
                <span aria-hidden="true" className="mt-1 text-emerald-700">
                  ●
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
            onClick={dismiss}
            type="button"
          >
            Entendido
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
