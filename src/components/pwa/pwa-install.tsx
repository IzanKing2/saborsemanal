"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handlePrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  if (!prompt) return null;

  return (
    <aside className="no-print fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-950 p-4 text-white shadow-xl sm:left-auto">
      <p className="flex-1 text-sm font-semibold">Instala SaborSemanal para usarla como una app.</p>
      <button
        className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-emerald-950 hover:bg-amber-200"
        onClick={() => {
          void prompt.prompt().then(() => {
            void prompt.userChoice.then(() => setPrompt(null));
          });
        }}
        type="button"
      >
        Instalar
      </button>
      <button
        aria-label="Cerrar aviso de instalación"
        className="p-1 text-emerald-100 hover:text-white"
        onClick={() => setPrompt(null)}
        type="button"
      >
        ×
      </button>
    </aside>
  );
}
