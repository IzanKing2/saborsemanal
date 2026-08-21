"use client";

import { useOnlineStatus } from "@/lib/use-online-status";

export default function RootError() {
  const online = useOnlineStatus();
  // Next's `reset()` only clears the error boundary and re-renders in
  // place -- it never re-requests data, so on a persistent failure (e.g.
  // still offline) tapping it looks like nothing happened at all. A real
  // reload guarantees a fresh attempt and visible browser feedback.
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ea] px-4 text-center">
      <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-xl" role="alert">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">Algo no salió bien</p>
        <h1 className="mt-3 text-3xl font-black text-stone-950">
          {online ? "No pudimos cargar esta vista" : "Estás sin conexión"}
        </h1>
        <p className="mt-3 text-stone-600">
          {online
            ? "Vuelve a intentarlo en unos segundos."
            : "Esta vista necesita conexión. Vuelve a intentarlo al recuperar cobertura."}
        </p>
        <button
          className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
