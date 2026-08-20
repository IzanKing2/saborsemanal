"use client";

import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <p
      className="no-print mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
      role="status"
    >
      Sin conexión. Puedes seguir marcando y quitando productos: se
      sincronizarán en cuanto vuelvas a tener cobertura.
    </p>
  );
}
