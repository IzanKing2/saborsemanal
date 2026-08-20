import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/lib/actions/cuenta";
import { RecipeSearch } from "@/components/navigation/recipe-search";
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
        .select("display_name, avatar_path")
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
        <Link className="text-lg font-black tracking-tight" href="/">
          Sabor<span className="text-amber-300">Semanal</span>
        </Link>
        <div className="hidden max-w-md flex-1 sm:block">
          <RecipeSearch />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold sm:gap-4">
          <ShoppingCart loggedIn={Boolean(user)} />
          <Link
            aria-label="Ver recetas públicas"
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:px-3"
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
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:px-3"
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
          {user && (
            <Link
              aria-label="Ver mis recetas favoritas"
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-emerald-100 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:px-3"
              href="/dashboard/favoritas"
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
                  d="M12 20.2s-7.5-4.6-9.7-9.1C.7 7.9 2.2 4.6 5.4 3.8c2-.5 3.9.3 5 1.9l1.6 2.2 1.6-2.2c1.1-1.6 3-2.4 5-1.9 3.2.8 4.7 4.1 3.1 7.3-2.2 4.5-9.7 9.1-9.7 9.1Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">Favoritas</span>
            </Link>
          )}
          {user ? (
            <>
              <Link
                className="flex items-center gap-2 rounded-full"
                href="/dashboard"
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
                    (profile?.display_name ?? user.email ?? "U")
                      .slice(0, 1)
                      .toUpperCase()
                  )}
                </span>
                <span className="hidden sm:block">Mi panel</span>
              </Link>
              <form action={logoutAction}>
                <button
                  className="rounded-lg border border-emerald-700 px-3 py-2 text-xs"
                  type="submit"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="text-emerald-100" href="/login">
                Entrar
              </Link>
              <Link
                className="rounded-lg bg-amber-300 px-3 py-2 text-emerald-950"
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
