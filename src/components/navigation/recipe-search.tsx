"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getRecipeImageUrls } from "@/lib/recipe-images";
import { createClient } from "@/lib/supabase/client";

type SearchResult = {
  id: string;
  titulo: string;
  imagenUrl: string | null;
  tiempo_preparacion: number;
  porciones: number;
};

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 6;

export function RecipeSearch({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestRef.current;
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_public_recipes", {
        p_query: trimmed,
        p_limit: MAX_RESULTS,
      });
      if (requestId !== requestRef.current) return;
      if (error) {
        setResults([]);
        setOpen(false);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      const imageUrls = await getRecipeImageUrls(
        supabase,
        rows.map((row) => row.imagen_url),
      );
      if (requestId !== requestRef.current) return;
      setResults(
        rows.map((row) => ({
          id: row.id,
          titulo: row.titulo,
          imagenUrl: row.imagen_url
            ? imageUrls.get(row.imagen_url) ?? null
            : null,
          tiempo_preparacion: row.tiempo_preparacion,
          porciones: row.porciones,
        })),
      );
      setOpen(true);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/recetas?q=${encodeURIComponent(trimmed)}`);
  }

  function goToRecipe(id: string) {
    setOpen(false);
    router.push(`/recetas/${id}`);
  }

  const dark = tone === "dark";

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        aria-label="Buscar recetas"
        autoComplete="off"
        className={`w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ${
          dark
            ? "border border-emerald-700 bg-emerald-950 text-white placeholder:text-emerald-300/60 focus:border-amber-300 focus:ring-amber-300/30"
            : "border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:ring-emerald-700/20"
        }`}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
        placeholder="Buscar recetas..."
        type="search"
        value={query}
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
          ...
        </span>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-stone-500">
              Sin resultados para «{query.trim()}».
            </p>
          ) : (
            <ul>
              {results.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-emerald-50"
                    onClick={() => goToRecipe(recipe.id)}
                    type="button"
                  >
                    <span className="relative block size-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {recipe.imagenUrl ? (
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="40px"
                          src={recipe.imagenUrl}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[9px] font-bold text-stone-400">
                          Sin foto
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-stone-900">
                        {recipe.titulo}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {recipe.tiempo_preparacion} min · {recipe.porciones}{" "}
                        porciones
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  className="w-full border-t border-stone-100 px-4 py-2.5 text-center text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                  onClick={submit}
                  type="button"
                >
                  Ver todos los resultados →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
