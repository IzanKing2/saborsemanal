import Link from "next/link";

import { logoutAction } from "@/lib/actions/cuenta";
import { RecipeSearch } from "@/components/navigation/recipe-search";
import { accountMenuLinks, UserMenu } from "@/components/navigation/user-menu";
import { ShoppingCart } from "@/components/shopping/shopping-cart";
import { getProfileAvatarUrl } from "@/lib/profile-avatars";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_path, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const avatarUrl = await getProfileAvatarUrl(
    supabase,
    profile?.avatar_path ?? null,
  );

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-40 border-b border-emerald-900 bg-emerald-950/85 text-white backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="shrink-0 text-lg font-black tracking-tight" href="/">
          Sabor<span className="text-amber-300">Semanal</span>
        </Link>
        <div className="hidden max-w-md flex-1 sm:block">
          <RecipeSearch />
        </div>
        {/* pt-1.5 -my-1.5: the scroll container clips anything poking
            outside its box, including the cart's badge (-top-1 -right-1);
            padding gives it room without shifting the row's visible
            position (offset back out by a matching negative margin). */}
        <div className="-my-1.5 flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto py-1.5 text-sm font-bold [scrollbar-width:none] sm:flex-none sm:gap-4 [&::-webkit-scrollbar]:hidden">
          <Link
            aria-label="Ver recetas públicas"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:px-3"
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
            <span className="hidden sm:inline">Recetas</span>
          </Link>
          <Link
            aria-label="Ir al planificador semanal"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:px-3"
            href={user ? "/dashboard/planificador" : "/planificador"}
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
            <span className="hidden sm:inline">Planificador</span>
          </Link>
          {/* Cart sits directly next to the account menu -- last icon
              before the avatar (or before the auth links for guests). */}
          <div className="shrink-0">
            <ShoppingCart loggedIn={Boolean(user)} />
          </div>
          {user ? (
            <UserMenu
              avatarUrl={avatarUrl}
              displayName={profile?.display_name ?? user.email ?? "U"}
              links={accountMenuLinks(profile?.role === "admin")}
              logout={logoutAction}
            />
          ) : (
            <>
              <Link className="shrink-0 text-emerald-100" href="/login">
                Entrar
              </Link>
              <Link
                className="shrink-0 rounded-lg bg-amber-300 px-3 py-2 text-emerald-950"
                href="/register"
              >
                <span className="sm:hidden">Crear</span>
                <span className="hidden sm:inline">Crear cuenta</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
