"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { MEAL_TYPES } from "@/lib/recipes";

type Allergen = {
  id: string;
  nombre: string;
};

type RecipeFiltersProps = {
  allergens: Allergen[];
  canRestorePreferences: boolean;
  filteredAllergenIds: string[];
  maxTime: number | null;
  mealTypes: string[];
  preferencesOff: boolean;
  query: string;
  usingPreferences: boolean;
  viewAllHref: string;
};

function FiltersForm({
  allergens,
  canRestorePreferences,
  filteredAllergenIds,
  maxTime,
  mealTypes,
  onSubmit,
  preferencesOff,
  query,
  usingPreferences,
  viewAllHref,
  idPrefix,
}: RecipeFiltersProps & {
  idPrefix: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      action="/recetas"
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={onSubmit}
    >
      <h2 className="text-lg font-bold text-stone-950">Filtros</h2>
      <input name="preferences" type="hidden" value="off" />
      {usingPreferences && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
          Aplicamos tus alérgenos guardados.
          <Link className="ml-1 font-bold underline" href={viewAllHref}>
            Ver todo
          </Link>
        </div>
      )}
      {preferencesOff && canRestorePreferences && (
        <Link
          className="mt-4 block text-xs font-bold text-emerald-700 underline"
          href="/recetas"
        >
          Restaurar mis preferencias
        </Link>
      )}
      <div className="mt-5">
        <label
          className="mb-1 block text-sm font-medium text-stone-700"
          htmlFor={`${idPrefix}-recipe-query`}
        >
          Buscar
        </label>
        <input
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          defaultValue={query}
          id={`${idPrefix}-recipe-query`}
          maxLength={120}
          name="q"
          placeholder="Título o descripción"
          type="search"
        />
      </div>

      <div className="mt-4">
        <label
          className="mb-1 block text-sm font-medium text-stone-700"
          htmlFor={`${idPrefix}-max-time`}
        >
          Tiempo máximo
        </label>
        <select
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          defaultValue={maxTime ?? ""}
          id={`${idPrefix}-max-time`}
          name="maxTime"
        >
          <option value="">Cualquier duración</option>
          <option value="15">Hasta 15 minutos</option>
          <option value="30">Hasta 30 minutos</option>
          <option value="60">Hasta 1 hora</option>
          <option value="120">Hasta 2 horas</option>
        </select>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-stone-700">
          Tipo de comida
        </legend>
        <div className="mt-2 space-y-2">
          {MEAL_TYPES.map((mealType) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-stone-600"
              key={mealType}
            >
              <input
                className="size-4 accent-emerald-700"
                defaultChecked={mealTypes.includes(mealType)}
                name="tipo"
                type="checkbox"
                value={mealType}
              />
              {mealType}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-stone-700">
          Excluir alérgenos
        </legend>
        <div className="mt-2 space-y-2">
          {allergens.map((allergen) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-stone-600"
              key={allergen.id}
            >
              <input
                className="size-4 accent-emerald-700"
                defaultChecked={filteredAllergenIds.includes(allergen.id)}
                name="allergen"
                type="checkbox"
                value={allergen.id}
              />
              {allergen.nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
        type="submit"
      >
        Aplicar filtros
      </button>
      <Link
        className="mt-3 block text-center text-sm font-semibold text-stone-500 hover:text-stone-900"
        href="/recetas"
      >
        Limpiar
      </Link>
    </form>
  );
}

export function RecipeFilters(props: RecipeFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeCount =
    (props.query ? 1 : 0) +
    (props.maxTime ? 1 : 0) +
    props.filteredAllergenIds.length +
    props.mealTypes.length;

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function submitMobileFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const formData = new FormData(event.currentTarget);
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.append(key, value);
    }
    setOpen(false);
    router.push(params.size ? `/recetas?${params}` : "/recetas");
  }

  return (
    <aside>
      <button
        className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-5 py-4 text-left shadow-sm lg:hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Búsqueda
          </span>
          <span className="mt-1 block text-lg font-black text-stone-950">
            Abrir filtros
          </span>
        </span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
          {activeCount} activos
        </span>
      </button>

      <div className="hidden lg:block">
        <FiltersForm {...props} idPrefix="desktop" />
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] bg-black/55 px-4 py-5"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <section
              aria-label="Filtros de recetas"
              aria-modal="true"
              className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-3xl bg-[#f6f3ea] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <header className="flex items-center justify-between border-b border-stone-200 bg-emerald-950 px-5 py-4 text-white">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                    Catálogo
                  </p>
                  <h2 className="text-xl font-black">Filtrar recetas</h2>
                </div>
                <button
                  aria-label="Cerrar filtros"
                  className="rounded-lg p-2 text-emerald-100 hover:bg-emerald-900 hover:text-white"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-5">
                <FiltersForm
                  {...props}
                  idPrefix="mobile"
                  onSubmit={submitMobileFilters}
                />
              </div>
            </section>
          </div>,
          document.body,
        )}
    </aside>
  );
}
