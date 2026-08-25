"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShoppingCart } from "@/components/shopping/shopping-cart";

// v2-style-guide.md section 5 requires a bottom bar on phones so the three
// destinations it names -- Menú, Recetas, Compra -- stay within one thumb's
// reach in the kitchen or the supermarket. Hidden from `sm` up, where the
// header already carries the same links.
//
// Render it as the last child of the page's <main>: the bar itself is fixed,
// so it carries its own in-flow spacer rather than making every container
// remember a matching bottom padding.
export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();

  // Guests plan on /planificador (LocalStorage); signed-in users on the
  // dashboard route. Both count as "Menú" for the active state.
  const plannerHref = loggedIn ? "/dashboard/planificador" : "/planificador";
  const onPlanner =
    pathname === "/planificador" || pathname === "/dashboard/planificador";
  const onRecipes = pathname === "/recetas" || pathname.startsWith("/recetas/");

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(3.5rem+env(safe-area-inset-bottom))] sm:hidden"
      />
      <nav
        aria-label="Navegación inferior"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900 bg-emerald-950/95 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-md sm:hidden"
      >
        <ul className="grid grid-cols-3">
          <li className="h-14">
            <BottomNavLink active={onPlanner} href={plannerHref} label="Menú">
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <rect height="17" rx="2" width="18" x="3" y="4.5" />
                <path d="M3 9.5h18" strokeLinecap="round" />
                <path d="M8 3v3M16 3v3" strokeLinecap="round" />
              </svg>
            </BottomNavLink>
          </li>
          <li className="h-14">
            <BottomNavLink active={onRecipes} href="/recetas" label="Recetas">
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5v-13Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </BottomNavLink>
          </li>
          {/* Reuses the header's cart wholesale: same drawer, same badge, one
              source of truth for the count. */}
          <li className="h-14">
            <ShoppingCart loggedIn={loggedIn} variant="tab" />
          </li>
        </ul>
      </nav>
    </>
  );
}

function BottomNavLink({
  active,
  children,
  href,
  label,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 transition ${
        active
          ? "text-amber-300"
          : "text-emerald-100 hover:bg-emerald-900 hover:text-white"
      }`}
      href={href}
    >
      {children}
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
