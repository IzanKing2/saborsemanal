import Link from "next/link";

import { SiteHeader } from "@/components/navigation/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f3ea] text-stone-950">
      <div className="relative bg-emerald-950 text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#fcd34d_0,transparent_28%),radial-gradient(circle_at_80%_70%,#34d399_0,transparent_25%)]" />
        <div className="relative"><SiteHeader /></div>
        <div className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="mt-24 max-w-4xl sm:mt-32">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">
              Cocina mejor, semana a semana
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
              Recetas pensadas para tu mesa.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-emerald-100">
              Descubre platos revisados, evita los alérgenos que necesites y
              construye tu propio recetario en un solo lugar.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-xl bg-amber-300 px-6 py-3 text-center font-bold text-emerald-950 hover:bg-amber-200"
                href="/recetas"
              >
                Explorar recetas
              </Link>
              <Link
                className="rounded-xl border border-emerald-600 px-6 py-3 text-center font-bold text-white hover:bg-emerald-900"
                href={user ? "/dashboard/planificador" : "/planificador"}
              >
                {user ? "Planificar mi semana" : "Planificar como invitado"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["01", "Recetas verificadas", "Cada publicación pasa por una revisión antes de llegar al catálogo."],
          ["02", "Filtros útiles", "Busca por tiempo y excluye platos según sus alérgenos asociados."],
          ["03", "Tu propia cocina", "Guarda borradores y escribe ingredientes propios cuando lo necesites."],
        ].map(([number, title, description]) => (
          <article
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            key={number}
          >
            <span className="text-xs font-black text-amber-700">{number}</span>
            <h2 className="mt-3 text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
