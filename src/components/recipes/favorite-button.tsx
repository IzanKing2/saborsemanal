"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { toggleFavoriteAction } from "@/lib/actions/favoritos";

export function FavoriteButton({
  recipeId,
  initial,
}: {
  recipeId: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initial);
  const [pending, setPending] = useState(false);

  function handleToggle() {
    if (pending) return;
    setPending(true);
    startTransition(async () => {
      const result = await toggleFavoriteAction(recipeId);
      if (result.ok) {
        setFavorited(result.favorited);
        router.refresh();
      }
      setPending(false);
    });
  }

  return (
    <button
      aria-label={favorited ? "Quitar de favoritas" : "Añadir a favoritas"}
      aria-pressed={favorited}
      className="flex items-center gap-1 rounded-full border border-emerald-800 bg-white px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50"
      disabled={pending}
      onClick={handleToggle}
      title={favorited ? "Quitar de favoritas" : "Añadir a favoritas"}
      type="button"
    >
      <svg
        aria-hidden="true"
        className={`size-4 ${favorited ? "fill-red-600 text-red-600" : "fill-none text-stone-400"}`}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 21s-6.7-4.3-9.3-8.2C.7 9.6 2.1 5.7 5.6 5.1c2.2-.4 4.4.7 5.4 2.5l1 1.6 1-1.6c1-1.8 3.2-2.9 5.4-2.5 3.5.6 4.9 4.5 2.9 7.7C18.7 16.7 12 21 12 21z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      {favorited ? "Favorita" : "Favorita"}
    </button>
  );
}
