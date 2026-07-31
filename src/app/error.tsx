"use client";

export default function RootError({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f3ea] px-4 text-center"><div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-xl" role="alert"><p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">Algo no salió bien</p><h1 className="mt-3 text-3xl font-black text-stone-950">No pudimos cargar esta vista</h1><p className="mt-3 text-stone-600">Comprueba tu conexión y vuelve a intentarlo.</p><button className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white" onClick={reset} type="button">Reintentar</button></div></main>;
}
