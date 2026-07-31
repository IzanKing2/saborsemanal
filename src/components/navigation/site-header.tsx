import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/lib/actions/cuenta";
import { getProfileAvatarUrl } from "@/lib/profile-avatars";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader({ tone = "dark" }: { tone?: "dark" | "light" }) {
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
  const dark = tone === "dark";

  return (
    <nav
      aria-label="Navegación principal"
      className={`border-b ${dark ? "border-emerald-900 bg-emerald-950 text-white" : "border-stone-200 bg-[#f6f3ea] text-stone-900"}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="text-lg font-black tracking-tight" href="/">
          Sabor<span className={dark ? "text-amber-300" : "text-amber-700"}>Semanal</span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold sm:gap-4">
          <Link className={dark ? "hidden text-emerald-100 hover:text-white sm:block" : "hidden text-stone-600 hover:text-stone-950 sm:block"} href="/recetas">Recetas</Link>
          <Link className={dark ? "hidden text-emerald-100 hover:text-white sm:block" : "hidden text-stone-600 hover:text-stone-950 sm:block"} href={user ? "/dashboard/planificador" : "/planificador"}>Planificador</Link>
          {user ? (
            <>
              <Link className="flex items-center gap-2 rounded-full" href="/dashboard">
                <span className={`relative flex size-9 items-center justify-center overflow-hidden rounded-full font-black ${dark ? "bg-amber-300 text-emerald-950" : "bg-emerald-950 text-amber-300"}`}>
                  {avatarUrl ? <Image alt="" className="object-cover" fill sizes="36px" src={avatarUrl} /> : (profile?.display_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:block">Mi panel</span>
              </Link>
              <form action={logoutAction}><button className={`rounded-lg border px-3 py-2 text-xs ${dark ? "border-emerald-700" : "border-stone-300"}`} type="submit">Salir</button></form>
            </>
          ) : (
            <>
              <Link className={dark ? "text-emerald-100" : "text-stone-600"} href="/login">Entrar</Link>
              <Link className="rounded-lg bg-amber-300 px-3 py-2 text-emerald-950" href="/register"><span className="sm:hidden">Crear</span><span className="hidden sm:inline">Crear cuenta</span></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
