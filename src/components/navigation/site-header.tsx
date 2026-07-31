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
            className="hidden text-emerald-100 hover:text-white sm:block"
            href="/recetas"
          >
            Recetas
          </Link>
          <Link
            className="hidden text-emerald-100 hover:text-white sm:block"
            href={user ? "/dashboard/planificador" : "/planificador"}
          >
            Planificador
          </Link>
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
