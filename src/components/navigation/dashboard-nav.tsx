"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";

const dashboardLinks = [
  ["Mis recetas", "/dashboard/recetas"],
  ["Mi grupo", "/dashboard/grupo"],
  ["Mi cuenta", "/dashboard/cuenta"],
] as const;

export function DashboardNav({
  isAdmin,
  logout,
}: {
  isAdmin: boolean;
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
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
        <nav
          aria-label="Panel de usuario"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-emerald-800 bg-emerald-950 text-sm font-bold shadow-xl"
        >
            <div className="flex flex-col py-1">
              {dashboardLinks.map(([label, href]) => (
                <Link
                  className="px-4 py-3 text-emerald-100 hover:bg-emerald-900 hover:text-white"
                  href={href}
                  key={href}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  className="px-4 py-3 text-amber-300 hover:bg-emerald-900"
                  href="/admin"
                  onClick={() => setOpen(false)}
                >
                  Administración
                </Link>
              )}
              <form action={logout}>
                <button
                  className="w-full border-t border-emerald-800 px-4 py-3 text-left text-emerald-100 hover:bg-emerald-900 hover:text-white"
                  type="submit"
                >
                  Salir
                </button>
              </form>
            </div>
          </nav>
      )}
    </div>
  );
}
