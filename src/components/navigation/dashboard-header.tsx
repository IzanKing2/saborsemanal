import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/lib/actions/cuenta";
import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { ShoppingCart } from "@/components/shopping/shopping-cart";

type DashboardHeaderProps = {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

const dashboardLinks = [
  ["Mis recetas", "/dashboard/recetas"],
  ["Favoritas", "/dashboard/favoritas"],
  ["Mi grupo", "/dashboard/grupo"],
  ["Mi cuenta", "/dashboard/cuenta"],
] as const;

export function DashboardHeader({
  displayName,
  avatarUrl,
  isAdmin,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900 bg-emerald-950/85 text-white shadow-lg shadow-emerald-950/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link className="shrink-0 text-lg font-black tracking-tight" href="/">
          Sabor<span className="text-amber-300">Semanal</span>
        </Link>
        <div className="hidden flex-1 items-center gap-4 sm:order-2 sm:flex">
          <nav
            aria-label="Panel de usuario"
            className="flex items-center gap-1 text-sm font-bold"
          >
            {dashboardLinks.map(([label, href]) => (
              <Link
                className="shrink-0 rounded-lg px-3 py-2 text-emerald-100 hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                className="shrink-0 rounded-lg px-3 py-2 text-amber-300 hover:bg-emerald-900"
                href="/admin"
              >
                Administración
              </Link>
            )}
          </nav>
        </div>
        <div className="order-2 ml-auto flex shrink-0 items-center gap-3 sm:order-3 sm:ml-0">
          <ShoppingCart loggedIn tone="dark" />
          <Link
            aria-label="Abrir mi cuenta"
            className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            href="/dashboard/cuenta"
          >
            <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-amber-300 font-black text-emerald-950">
              {avatarUrl ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="36px"
                  src={avatarUrl}
                />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="hidden max-w-32 truncate text-sm font-bold lg:block">
              {displayName}
            </span>
          </Link>
          <DashboardNav isAdmin={isAdmin} logout={logoutAction} />
          <form action={logoutAction} className="hidden sm:block">
            <button
              className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-100 hover:border-emerald-500 hover:text-white"
              type="submit"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
