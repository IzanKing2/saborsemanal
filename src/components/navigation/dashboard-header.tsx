import Link from "next/link";

import { logoutAction } from "@/lib/actions/cuenta";
import { accountMenuLinks } from "@/components/navigation/account-menu-links";
import { UserMenu } from "@/components/navigation/user-menu";
import { ShoppingCart } from "@/components/shopping/shopping-cart";

type DashboardHeaderProps = {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export function DashboardHeader({
  displayName,
  avatarUrl,
  isAdmin,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900 bg-emerald-950/85 text-white shadow-lg shadow-emerald-950/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="shrink-0 text-lg font-black tracking-tight" href="/">
          Sabor<span className="text-amber-300">Semanal</span>
        </Link>
        {/* pt-1.5 -my-1.5: the scroll container clips anything poking
            outside its box, including the cart's badge (-top-1 -right-1);
            padding gives it room without shifting the row's visible
            position (offset back out by a matching negative margin). */}
        <div className="-my-1.5 ml-auto flex min-w-0 items-center gap-2 overflow-x-auto py-1.5 [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
          <Link
            aria-label="Ver recetas públicas"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:flex sm:px-3"
            href="/recetas"
          >
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
            <span className="hidden lg:inline">Recetas</span>
          </Link>
          <Link
            aria-label="Ir al planificador semanal"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:flex sm:px-3"
            href="/dashboard/planificador"
          >
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
            <span className="hidden lg:inline">Planificador</span>
          </Link>
          {/* Cart sits next to the account menu from `sm` up -- on phones
              the bottom bar carries it instead. */}
          <div className="hidden shrink-0 sm:block">
            <ShoppingCart loggedIn tone="dark" />
          </div>
          <UserMenu
            avatarUrl={avatarUrl}
            displayName={displayName}
            links={accountMenuLinks(isAdmin)}
            logout={logoutAction}
          />
        </div>
      </div>
    </header>
  );
}
