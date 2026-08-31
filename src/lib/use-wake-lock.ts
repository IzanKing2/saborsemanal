"use client";

import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras dura el componente. Donde la API no
 * existe (Safari antiguo, escritorio) simplemente no hace nada: es una
 * comodidad, no un requisito. Se vuelve a pedir al recuperar el foco porque el
 * navegador la libera al pasar la pestaña a segundo plano.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    const wakeLock = navigator.wakeLock;
    if (!active || !wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function request() {
      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        // Denegada por batería baja o por política del navegador.
      }
      if (cancelled) void sentinel?.release();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") void request();
    }

    void request();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release();
    };
  }, [active]);
}
