import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ea] px-4 py-12 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
          SaborSemanal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Tu cocina</h1>
        <p className="mt-3 max-w-xl leading-7 text-stone-600">
          Organiza tus recetas y prepara el contenido que más adelante formará
          parte de tu menú semanal.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            className="group rounded-2xl bg-emerald-950 p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            href="/dashboard/recetas"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Recetario
            </span>
            <h2 className="mt-3 text-2xl font-bold">Mis recetas</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100">
              Crea borradores, añade ingredientes y envía tus platos a revisión.
            </p>
            <span className="mt-6 inline-block text-sm font-bold text-amber-300 group-hover:underline">
              Abrir recetario →
            </span>
          </Link>

          <Link
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            href="/dashboard/planificador"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              Menú semanal
            </span>
            <h2 className="mt-3 text-2xl font-bold text-stone-900">
              Planificador semanal
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Distribuye recetas por día y comida con sincronización en tu cuenta.
            </p>
            <span className="mt-6 inline-block text-sm font-bold text-emerald-700 group-hover:underline">
              Planificar semana →
            </span>
          </Link>

          <Link
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:col-span-2"
            href="/dashboard/lista-compra"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              Compra organizada
            </span>
            <h2 className="mt-3 text-2xl font-bold text-stone-900">
              Lista de la compra
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Consolida los ingredientes del menú y marca lo que ya está en la
              cesta.
            </p>
            <span className="mt-6 inline-block text-sm font-bold text-emerald-700 group-hover:underline">
              Preparar compra →
            </span>
          </Link>

          <Link
            className="group rounded-2xl bg-amber-200 p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-lg md:col-span-2"
            href="/dashboard/cuenta"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-900">
              Tu espacio
            </span>
            <h2 className="mt-3 text-2xl font-bold text-stone-950">
              Perfil y preferencias
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Actualiza tu foto, protege tu acceso y adapta el catálogo a tus
              alérgenos.
            </p>
            <span className="mt-6 inline-block text-sm font-bold text-emerald-900 group-hover:underline">
              Gestionar mi cuenta →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
