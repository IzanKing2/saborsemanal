"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import {
  findIngredientOption,
  RECIPE_UNITS,
  type IngredientOption,
  type RecipeUnit,
} from "@/lib/recipes";

export type IngredientRow = {
  key: string;
  // Lo que el usuario escribió. Si coincide con el catálogo se guarda como
  // ingrediente maestro y si no, como texto libre: el origen se resuelve solo.
  texto: string;
  cantidad: string;
  unidad: RecipeUnit;
};

type RecipeIngredientsEditorProps = {
  rows: IngredientRow[];
  options: IngredientOption[];
  error?: string;
  errorId: string;
  onChange: (rows: IngredientRow[]) => void;
};

// Sin ancho: cada campo de la fila fija el suyo. Si la base llevara `w-full`,
// ganaría por orden en la hoja de estilos y aplastaría al `w-20` de la cantidad
// y al `flex-1` de la unidad.
const fieldClass =
  "rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";
const inputClass = `w-full ${fieldClass}`;
const amountClass = `w-20 shrink-0 ${fieldClass} md:w-full`;
const unitClass = `min-w-0 flex-1 ${fieldClass} md:w-full md:flex-none`;
const errorInputClass = "border-red-500 focus:border-red-600 focus:ring-red-500/20";

function rowIsComplete(row: { texto: string; cantidad: string }) {
  const amount = Number(row.cantidad);
  return row.texto.trim().length >= 2 && Number.isFinite(amount) && amount > 0;
}

export function RecipeIngredientsEditor({
  rows,
  options,
  error,
  errorId,
  onChange,
}: RecipeIngredientsEditorProps) {
  const listId = useId();
  const draftRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({
    texto: "",
    cantidad: "1",
    unidad: "unidad" as RecipeUnit,
  });
  const [draftError, setDraftError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function addDraft() {
    if (!rowIsComplete(draft)) {
      setDraftError("Escribe el ingrediente y una cantidad mayor que 0.");
      draftRef.current?.focus();
      return;
    }

    onChange([
      ...rows,
      {
        key: crypto.randomUUID(),
        texto: draft.texto.trim(),
        cantidad: draft.cantidad,
        unidad: draft.unidad,
      },
    ]);
    setAnnouncement(`${draft.texto.trim()} añadido a los ingredientes.`);
    setDraftError(null);
    // La unidad se conserva: encadenar "200 g harina, 100 g azúcar" es lo
    // habitual y así solo hay que escribir el nombre y la cantidad.
    setDraft((current) => ({ texto: "", cantidad: "1", unidad: current.unidad }));
    draftRef.current?.focus();
  }

  function updateRow(key: string, patch: Partial<IngredientRow>) {
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(key: string) {
    const removed = rows.find((row) => row.key === key);
    if (editingKey === key) setEditingKey(null);
    onChange(rows.filter((row) => row.key !== key));
    setAnnouncement(`${removed?.texto.trim() || "Ingrediente"} eliminado.`);
    draftRef.current?.focus();
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addDraft();
  }

  const describedBy = error ? errorId : undefined;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-stone-950">
          Ingredientes{" "}
          <span aria-hidden="true" className="text-emerald-700">
            *
          </span>
          <span className="sr-only">(obligatorio)</span>
        </h2>
        <p className="text-xs text-stone-500">
          {rows.length === 0
            ? "Escribe un ingrediente y pulsa Enter"
            : `${rows.length} ${rows.length === 1 ? "ingrediente" : "ingredientes"}`}
        </p>
      </div>

      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.nombre}>
            {option.categoriaNombre ?? ""}
          </option>
        ))}
      </datalist>

      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100">
          {rows.map((row, index) => {
            const editing = editingKey === row.key || !rowIsComplete(row);
            const isCustom = findIngredientOption(row.texto, options) === null;

            if (!editing) {
              return (
                <li
                  className="flex items-center justify-between gap-3 py-2"
                  key={row.key}
                >
                  <p className="min-w-0 text-sm text-stone-800">
                    <span className="font-bold">
                      {row.cantidad} {row.unidad}
                    </span>
                    <span className="text-stone-400"> · </span>
                    <span className="break-words">{row.texto}</span>
                    {isCustom && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        texto libre
                      </span>
                    )}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      aria-label={`Editar ${row.texto}`}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100"
                      onClick={() => setEditingKey(row.key)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      aria-label={`Quitar ${row.texto}`}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 active:bg-red-100"
                      onClick={() => removeRow(row.key)}
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li className="py-2" key={row.key}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(0,1fr)_5.5rem_8.5rem_auto] md:items-center">
                  <label className="sr-only" htmlFor={`ingredient-${row.key}`}>
                    Ingrediente {index + 1}
                  </label>
                  <input
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                    autoFocus={editingKey === row.key}
                    className={`col-span-2 ${inputClass} md:col-span-1 ${error ? errorInputClass : ""}`}
                    id={`ingredient-${row.key}`}
                    list={listId}
                    maxLength={100}
                    onChange={(event) =>
                      updateRow(row.key, { texto: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Escape") {
                        event.preventDefault();
                        if (rowIsComplete(row)) setEditingKey(null);
                      }
                    }}
                    placeholder="Ej. Azúcar"
                    type="text"
                    value={row.texto}
                  />
                  <div className="col-span-2 flex gap-2 md:contents">
                    <label
                      className="sr-only"
                      htmlFor={`ingredient-amount-${row.key}`}
                    >
                      Cantidad de {row.texto || `ingrediente ${index + 1}`}
                    </label>
                    <input
                      className={amountClass}
                      id={`ingredient-amount-${row.key}`}
                      min="0.01"
                      onChange={(event) =>
                        updateRow(row.key, { cantidad: event.target.value })
                      }
                      onFocus={(event) => event.target.select()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (rowIsComplete(row)) setEditingKey(null);
                        }
                      }}
                      step="any"
                      type="number"
                      value={row.cantidad}
                    />
                    <label
                      className="sr-only"
                      htmlFor={`ingredient-unit-${row.key}`}
                    >
                      Unidad de {row.texto || `ingrediente ${index + 1}`}
                    </label>
                    <select
                      className={unitClass}
                      id={`ingredient-unit-${row.key}`}
                      onChange={(event) =>
                        updateRow(row.key, {
                          unidad: event.target.value as RecipeUnit,
                        })
                      }
                      value={row.unidad}
                    >
                      {RECIPE_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        aria-label={`Guardar ${row.texto || `ingrediente ${index + 1}`}`}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-30"
                        disabled={!rowIsComplete(row)}
                        onClick={() => setEditingKey(null)}
                        type="button"
                      >
                        Listo
                      </button>
                      <button
                        aria-label={`Quitar ${row.texto || `ingrediente ${index + 1}`}`}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 active:bg-red-100"
                        onClick={() => removeRow(row.key)}
                        type="button"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 rounded-xl bg-stone-50 p-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(0,1fr)_5.5rem_8.5rem_auto] md:items-center">
          <label className="sr-only" htmlFor="ingredient-draft">
            Añadir ingrediente
          </label>
          <input
            aria-describedby={
              draftError ? "ingredient-draft-error" : describedBy
            }
            autoComplete="off"
            className={`col-span-2 ${inputClass} md:col-span-1`}
            id="ingredient-draft"
            list={listId}
            maxLength={100}
            onChange={(event) => {
              setDraft((current) => ({ ...current, texto: event.target.value }));
              if (draftError) setDraftError(null);
            }}
            onKeyDown={handleDraftKeyDown}
            placeholder="Añade un ingrediente..."
            ref={draftRef}
            type="text"
            value={draft.texto}
          />
          <div className="col-span-2 flex gap-2 md:contents">
            <label className="sr-only" htmlFor="ingredient-draft-amount">
              Cantidad
            </label>
            <input
              className={amountClass}
              id="ingredient-draft-amount"
              min="0.01"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cantidad: event.target.value,
                }))
              }
              onFocus={(event) => event.target.select()}
              onKeyDown={handleDraftKeyDown}
              step="any"
              type="number"
              value={draft.cantidad}
            />
            <label className="sr-only" htmlFor="ingredient-draft-unit">
              Unidad
            </label>
            <select
              className={unitClass}
              id="ingredient-draft-unit"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  unidad: event.target.value as RecipeUnit,
                }))
              }
              onKeyDown={handleDraftKeyDown}
              value={draft.unidad}
            >
              {RECIPE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <button
              aria-label="Añadir ingrediente a la receta"
              className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 active:bg-emerald-900"
              onClick={addDraft}
              type="button"
            >
              +
            </button>
          </div>
        </div>
        {draftError ? (
          <p className="mt-1.5 text-xs text-red-600" id="ingredient-draft-error">
            {draftError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-stone-500">
            Pulsa Enter para añadirlo y seguir escribiendo.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600" id={errorId}>
          {error}
        </p>
      )}
    </section>
  );
}
