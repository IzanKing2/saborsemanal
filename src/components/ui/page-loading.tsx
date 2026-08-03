export function PageLoading({ label = "Cargando" }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ea] px-4 text-stone-900">
      <div
        aria-live="polite"
        className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm"
        role="status"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-950">
          <span className="size-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
          SaborSemanal
        </p>
        <p className="mt-2 text-lg font-bold text-stone-900">{label}...</p>
      </div>
    </main>
  );
}
