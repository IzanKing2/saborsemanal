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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700">
            Así de fácil
          </p>
          <h2 className="mt-3 text-3xl font-black text-stone-950 sm:text-4xl">
            Cómo funciona
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-stone-600">
            Tres pasos para pasar de «¿qué cocino esta semana?» a la mesa
            puesta.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-emerald-950 font-black text-amber-300">
              1
            </span>
            <h3 className="mt-4 text-xl font-bold text-stone-950">
              Encuentra tu plato
            </h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">
              Busca en el catálogo, filtra por tiempo máximo y descarta los
              alérgenos que quieras evitar. Guarda tus favoritas con un corazón.
            </p>
            <Link
              className="mt-5 inline-block text-sm font-bold text-emerald-800 hover:underline"
              href="/recetas"
            >
              Explorar recetas →
            </Link>
          </article>

          <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-emerald-950 font-black text-amber-300">
              2
            </span>
            <h3 className="mt-4 text-xl font-bold text-stone-950">
              Planifica tu semana
            </h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">
              Añade recetas al calendario del planificador desde cualquier ficha
              y organiza cada día y cada comida de la semana.
            </p>
            <Link
              className="mt-5 inline-block text-sm font-bold text-emerald-800 hover:underline"
              href={user ? "/dashboard/planificador" : "/planificador"}
            >
              Planificar mi semana →
            </Link>
          </article>

          <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-emerald-950 font-black text-amber-300">
              3
            </span>
            <h3 className="mt-4 text-xl font-bold text-stone-950">
              Haz la compra
            </h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">
              Añade recetas a tu lista con un clic y marca lo que ya tienes en
              casa desde el carrito de la parte superior.
            </p>
            <Link
              className="mt-5 inline-block text-sm font-bold text-emerald-800 hover:underline"
              href={user ? "/dashboard/lista-compra" : "/planificador"}
            >
              {user ? "Abrir lista de la compra →" : "Empezar a planificar →"}
            </Link>
          </article>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl bg-emerald-950 px-6 py-6 text-white sm:flex-row sm:px-8">
          <div>
            <p className="text-lg font-bold">
              ¿Ya tienes cuenta? Retoma tu planificación.
            </p>
            <p className="mt-1 text-sm text-emerald-100">
              Tus recetas, favoritas y listas se sincronizan entre dispositivos.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              className="rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-amber-200"
              href={user ? "/dashboard" : "/register"}
            >
              {user ? "Ir a mi panel" : "Crear cuenta"}
            </Link>
            {!user && (
              <Link
                className="rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-900"
                href="/login"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
