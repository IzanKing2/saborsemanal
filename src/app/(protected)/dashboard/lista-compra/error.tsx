"use client";

export default function ShoppingListError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#f6f3ea] px-4 py-16 text-stone-900 sm:px-6">
      <div
        className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm"
        role="alert"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Lista de la compra
        </p>
        <h1 className="mt-3 text-2xl font-black">No pudimos cargar la lista</h1>
        <p className="mt-2 text-stone-600">
          Revisa tu conexión y vuelve a intentarlo.
        </p>
        <button
          className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          onClick={reset}
          type="button"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
