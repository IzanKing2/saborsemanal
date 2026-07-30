import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ea] px-4 py-12 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
          SaborSemanal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          Panel de administración
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-stone-600">
          Gestiona los catálogos globales y prepara el contenido que usarán las
          recetas de toda la comunidad.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            className="group rounded-2xl border border-emerald-900/10 bg-emerald-950 p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            href="/admin/ingredientes"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Catálogo global
            </span>
            <h2 className="mt-3 text-2xl font-bold">
              Ingredientes y alérgenos
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100">
              Crea categorías, clasifica ingredientes y configura sus
              alérgenos asociados.
            </p>
            <span className="mt-6 inline-block text-sm font-bold text-amber-300 group-hover:underline">
              Gestionar catálogo →
            </span>
          </Link>

          <Link
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            href="/admin/recetas"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              Control editorial
            </span>
            <h2 className="mt-3 text-2xl font-bold text-stone-900">
              Moderación de recetas
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Revisa las propuestas de la comunidad antes de publicarlas en el
              catálogo.
            </p>
            <span className="mt-6 inline-block text-sm font-bold text-emerald-700 group-hover:underline">
              Revisar pendientes →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
