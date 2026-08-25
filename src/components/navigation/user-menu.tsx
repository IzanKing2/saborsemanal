"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MenuLink } from "@/components/navigation/account-menu-links";
import { useMenuDismiss } from "@/lib/use-dialog-focus";

export function UserMenu({
  displayName,
  avatarUrl,
  links,
  logout,
}: {
  displayName: string;
  avatarUrl: string | null;
  links: MenuLink[];
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useMenuDismiss(open, () => setOpen(false));

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((current) => !current);
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        aria-label="Configurar mi cuenta"
        className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        href="/dashboard/cuenta"
      >
        <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-amber-300 font-black text-emerald-950">
          {avatarUrl ? (
            <Image alt="" className="object-cover" fill sizes="36px" src={avatarUrl} />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-bold lg:block">
          {displayName}
        </span>
      </Link>

      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="shrink-0 rounded-lg p-2 text-emerald-100 hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        onClick={toggleOpen}
        ref={buttonRef}
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
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
              role="presentation"
            />
            <nav
              aria-label="Menú"
              className="fixed z-50 w-60 overflow-hidden rounded-xl border border-emerald-800 bg-emerald-950 text-sm font-bold shadow-xl"
              style={{ top: position.top, right: position.right }}
            >
              <div className="flex flex-col py-1">
                {links.map((link) => (
                  <Link
                    className={`px-4 py-3 hover:bg-emerald-900 hover:text-white ${
                      link.accent ? "text-amber-300" : "text-emerald-100"
                    }`}
                    href={link.href}
                    key={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <form action={logout}>
                  <button
                    className="w-full border-t border-emerald-800 px-4 py-3 text-left text-red-400 hover:bg-red-950 hover:text-red-300"
                    type="submit"
                  >
                    Salir
                  </button>
                </form>
              </div>
            </nav>
          </>,
          document.body,
        )}
    </div>
  );
}
