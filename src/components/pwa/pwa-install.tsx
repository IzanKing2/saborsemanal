"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "saborsemanal:pwa-install-dismissed-until";
const INSTALLED_KEY = "saborsemanal:pwa-installed";
// Cerrarlo no debe silenciarlo para siempre, solo dar un respiro razonable
// antes de volver a preguntar.
const SNOOZE_DAYS = 14;

function isSnoozed() {
  try {
    const until = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(
      DISMISSED_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {
    // Sin storage no se puede recordar el aplazamiento; volverá a preguntar
    // en la próxima carga, que es el comportamiento anterior, no uno peor.
  }
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handlePrompt(event: Event) {
      event.preventDefault();
      let alreadyInstalled = false;
      try {
        alreadyInstalled = localStorage.getItem(INSTALLED_KEY) === "true";
      } catch {
        // Sin storage no se sabe si ya está instalada; mejor preguntar de
        // nuevo que dejar a alguien sin la opción de instalar.
      }
      if (alreadyInstalled || isSnoozed()) return;
      setPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setPrompt(null);
      try {
        localStorage.setItem(INSTALLED_KEY, "true");
      } catch {
        // No pasa nada: el navegador tampoco volverá a disparar
        // beforeinstallprompt para una app ya instalada.
      }
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <aside className="no-print fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] left-4 right-4 z-40 sm:bottom-4 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-950 p-4 text-white shadow-xl sm:left-auto">
      <p className="flex-1 text-sm font-semibold">Instala SaborSemanal para usarla como una app.</p>
      <button
        className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-emerald-950 hover:bg-amber-200"
        onClick={() => {
          void prompt.prompt().then(() => {
            void prompt.userChoice.then((choice) => {
              setPrompt(null);
              // Si cancela el diálogo nativo, es un "no por ahora": el mismo
              // aplazamiento que al cerrar el aviso con la X.
              if (choice.outcome === "dismissed") snooze();
            });
          });
        }}
        type="button"
      >
        Instalar
      </button>
      <button
        aria-label="Cerrar aviso de instalación"
        className="p-1 text-emerald-100 hover:text-white"
        onClick={() => {
          setPrompt(null);
          snooze();
        }}
        type="button"
      >
        ×
      </button>
    </aside>
  );
}
