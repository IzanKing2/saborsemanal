import Link from "next/link";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f3ea] px-4 text-center text-stone-900"><div><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-700">404 · Fuera de carta</p><h1 className="mt-4 text-5xl font-black">No encontramos esta página</h1><p className="mx-auto mt-4 max-w-lg text-stone-600">Puede que la receta haya cambiado o que el enlace ya no esté disponible.</p><Link className="mt-8 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white" href="/">Volver al inicio</Link></div></main>;
}
