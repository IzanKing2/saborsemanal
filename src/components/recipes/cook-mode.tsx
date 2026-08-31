"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { formatShoppingQuantity } from "@/lib/shopping-list";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { useWakeLock } from "@/lib/use-wake-lock";

type CookModeIngredient = {
  nombre: string;
  cantidad: number;
  unidad: string;
};

type CookModeProps = {
  titulo: string;
  pasos: string[];
  ingredientes: CookModeIngredient[];
};

/**
 * Cocinar con el móvil en la encimera: un paso cada vez, tipografía grande y
 * la pantalla encendida. Los ingredientes quedan a un toque para no tener que
 * salir a consultarlos a media receta.
 */
export function CookMode({ titulo, pasos, ingredientes }: CookModeProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (pasos.length === 0) return null;

  return (
    <>
      <button
        className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-950 active:scale-95"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        Modo cocina
      </button>
      {open && (
        <CookModeOverlay
          ingredientes={ingredientes}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
          pasos={pasos}
          titulo={titulo}
        />
      )}
    </>
  );
}

function CookModeOverlay({
  titulo,
  pasos,
  ingredientes,
  onClose,
}: CookModeProps & { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  // Con la hoja de ingredientes abierta, Escape debe cerrarla solo a ella: los
  // dos diálogos escuchan la tecla, así que aquí se ignora mientras esté abierta.
  const dialogRef = useDialogFocus<HTMLDivElement>(true, () => {
    if (!showIngredients) onClose();
  });

  useWakeLock();

  const isFirst = index === 0;
  const isLast = index === pasos.length - 1;

  function goTo(target: number) {
    setIndex(Math.min(Math.max(target, 0), pasos.length - 1));
  }

  useEffect(() => {
    function handleArrows(event: KeyboardEvent) {
      // Las flechas avanzan y retroceden, como en una presentación. Tab y
      // Escape los gestiona `useDialogFocus`.
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, pasos.length - 1));
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      }
    }

    document.addEventListener("keydown", handleArrows);
    return () => document.removeEventListener("keydown", handleArrows);
  }, [pasos.length]);

  return createPortal(
    <div
      aria-label={`Modo cocina: ${titulo}`}
      aria-modal="true"
      className="fixed inset-0 z-[75] flex flex-col bg-[#f6f3ea]"
      ref={dialogRef}
      role="dialog"
    >
      <header className="bg-emerald-950 px-4 pt-3 pb-2 text-white sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
              Modo cocina
            </p>
            <h2 className="truncate text-sm font-bold sm:text-base">{titulo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-expanded={showIngredients}
              className="rounded-full border border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-900 active:scale-95"
              onClick={() => setShowIngredients(true)}
              type="button"
            >
              Ingredientes
            </button>
            <button
              className="rounded-full bg-white/95 px-4 py-2.5 text-xs font-bold text-emerald-950 transition hover:bg-white active:scale-95"
              onClick={onClose}
              type="button"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Cada paso es un punto tocable: se ve dónde estás y cuánto queda, y
            permite saltar sin recorrer toda la receta. */}
        <nav
          aria-label="Pasos de la receta"
          className="mx-auto mt-3 flex max-w-3xl gap-1.5"
        >
          {pasos.map((paso, position) => {
            const done = position < index;
            const current = position === index;
            return (
              <button
                aria-current={current ? "step" : undefined}
                aria-label={`Ir al paso ${position + 1} de ${pasos.length}`}
                className={`h-2 flex-1 rounded-full transition ${
                  current
                    ? "bg-amber-300"
                    : done
                      ? "bg-emerald-500"
                      : "bg-emerald-800 hover:bg-emerald-700"
                }`}
                key={`${position}-${paso.slice(0, 8)}`}
                onClick={() => goTo(position)}
                type="button"
              />
            );
          })}
        </nav>
      </header>

      {/* El paso se centra en el espacio disponible: es lo único que importa
          mientras cocinas, y así no queda flotando arriba con media pantalla
          vacía debajo. */}
      <div className="flex flex-1 items-center overflow-y-auto px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <p className="flex items-baseline gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-900 text-base text-white">
              {index + 1}
            </span>
            <span>
              Paso {index + 1}{" "}
              <span className="text-stone-400">de {pasos.length}</span>
            </span>
          </p>
          <p className="mt-5 text-2xl leading-relaxed text-stone-900 sm:text-3xl sm:leading-relaxed">
            {pasos[index]}
          </p>
          {!isLast && (
            <p className="mt-8 border-t border-stone-200 pt-4 text-sm leading-relaxed text-stone-500">
              <span className="font-bold text-stone-600">Después: </span>
              {pasos[index + 1]}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-stone-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            className="flex-1 rounded-xl border border-stone-300 px-4 py-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isFirst}
            onClick={() => goTo(index - 1)}
            type="button"
          >
            Anterior
          </button>
          <button
            className="flex-[2] rounded-xl bg-emerald-700 px-4 py-4 text-sm font-bold text-white transition hover:bg-emerald-800 active:scale-[0.98]"
            onClick={() => (isLast ? onClose() : goTo(index + 1))}
            type="button"
          >
            {isLast ? "Terminar" : "Siguiente paso"}
          </button>
        </div>
      </div>

      {showIngredients && (
        <IngredientsSheet
          ingredientes={ingredientes}
          onClose={() => setShowIngredients(false)}
        />
      )}
    </div>,
    document.body,
  );
}

/**
 * Hoja inferior con los ingredientes. Va superpuesta y no empuja el paso: en
 * mitad de una receta, ver la cantidad no debería mover lo que estás leyendo.
 */
function IngredientsSheet({
  ingredientes,
  onClose,
}: {
  ingredientes: CookModeIngredient[];
  onClose: () => void;
}) {
  const sheetRef = useDialogFocus<HTMLDivElement>(true, onClose);

  return (
    <div
      className="absolute inset-0 z-10 flex items-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="cook-mode-ingredients-title"
        aria-modal="true"
        className="max-h-[70%] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:px-6"
        onClick={(event) => event.stopPropagation()}
        ref={sheetRef}
        role="dialog"
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <h3
              className="text-lg font-black text-stone-950"
              id="cook-mode-ingredients-title"
            >
              Ingredientes
            </h3>
            <button
              className="rounded-full border border-stone-300 px-4 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
              onClick={onClose}
              type="button"
            >
              Cerrar
            </button>
          </div>

          {ingredientes.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              Esta receta no tiene ingredientes registrados.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {ingredientes.map((ingrediente) => (
                <li
                  className="flex items-baseline justify-between gap-4 py-3"
                  key={`${ingrediente.nombre}-${ingrediente.unidad}`}
                >
                  <span className="text-base leading-relaxed text-stone-700">
                    {ingrediente.nombre}
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                    {formatShoppingQuantity(ingrediente.cantidad)}{" "}
                    {ingrediente.unidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
