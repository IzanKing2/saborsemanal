"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";

import { useMenuDismiss } from "@/lib/use-dialog-focus";

const adminLinks = [
  ["Catálogos", "/admin/ingredientes"],
  ["Moderación", "/admin/recetas"],
  ["Mi panel", "/dashboard"],
] as const;

export function AdminNav({ logout }: { logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  useMenuDismiss(open, () => setOpen(false));

  return (
    <>
      <nav className="hidden min-w-0 items-center gap-3 text-sm font-bold md:flex">
        {adminLinks.map(([label, href]) => (
          <Link
            className="shrink-0 text-emerald-100 hover:text-white"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
        <form action={logout}>
          <button
            className="rounded-lg border border-emerald-700 px-3 py-2"
            type="submit"
          >
            Salir
          </button>
        </form>
      </nav>

      <div className="relative md:hidden">
        <button
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="rounded-lg border border-emerald-700 p-2 text-emerald-100 hover:bg-emerald-900 hover:text-white"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        {open &&
          createPortal(
            <div
              aria-hidden="true"
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
              role="presentation"
            />,
            document.body,
          )}
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-emerald-800 bg-emerald-950 text-sm font-bold shadow-xl">
              <nav className="flex flex-col">
                {adminLinks.map(([label, href]) => (
                  <Link
                    className="px-4 py-3 text-emerald-100 hover:bg-emerald-900 hover:text-white"
                    href={href}
                    key={href}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                <form action={logout}>
                  <button
                    className="w-full border-t border-emerald-800 px-4 py-3 text-left text-emerald-100 hover:bg-emerald-900 hover:text-white"
                    type="submit"
                  >
                    Salir
                  </button>
                </form>
              </nav>
            </div>
        )}
      </div>
    </>
  );
}
