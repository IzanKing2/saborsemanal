"use client";

import { useEffect } from "react";

import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();

  // Client-side navigation to this page (clicking a Link) never fires a
  // browser "navigate" request, so the service worker never sees a plain
  // document fetch to cache for offline use. A background fetch of our own
  // URL is a normal document request from the SW's point of view, so it
  // warms the offline cache with the latest list every time this page is
  // viewed while online, regardless of how the user got here.
  useEffect(() => {
    if (!online) return;
    fetch(window.location.pathname, { cache: "reload" }).catch(() => {});
  }, [online]);

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
