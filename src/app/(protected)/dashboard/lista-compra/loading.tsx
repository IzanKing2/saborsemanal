export default function ShoppingListLoading() {
  return (
    <main className="min-h-screen bg-[#f6f3ea] px-4 py-16 text-stone-900 sm:px-6">
      <div
        aria-live="polite"
        className="mx-auto max-w-4xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Lista de la compra
        </p>
        <p className="mt-3 text-lg font-bold">Cargando ingredientes...</p>
      </div>
    </main>
  );
}
