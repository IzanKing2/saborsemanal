import Link from "next/link";

export function AuthShell({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-[#f6f3ea] text-stone-900 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_15%,#fcd34d_0,transparent_25%),radial-gradient(circle_at_85%_80%,#34d399_0,transparent_30%)]" />
        <Link className="relative text-xl font-black" href="/">Sabor<span className="text-amber-300">Semanal</span></Link>
        <div className="relative max-w-lg">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Cocina con intención</p>
          <p className="mt-5 text-5xl font-black leading-[0.98]">Tu semana empieza en una cocina bien organizada.</p>
          <p className="mt-6 leading-7 text-emerald-100">Recetas, planificación y compra reunidas en un espacio que se adapta a tus preferencias.</p>
        </div>
        <p className="relative text-sm text-emerald-300">Menos improvisación. Más tiempo alrededor de la mesa.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link className="mb-10 inline-block text-lg font-black text-emerald-950 lg:hidden" href="/">Sabor<span className="text-amber-600">Semanal</span></Link>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">{title}</h1>
          <p className="mt-3 leading-7 text-stone-600">{description}</p>
          <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
